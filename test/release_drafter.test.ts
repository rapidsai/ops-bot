/*
* Copyright (c) 2022, NVIDIA CORPORATION.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import { ReleaseDrafter } from "../src/plugins/ReleaseDrafter/release_drafter";
import { release_drafter as listPullsResp } from "./fixtures/responses/list_pulls.json";
import { default as getReleaseByTagResp } from "./fixtures/responses/get_release_by_tag.json";
import {
  mockGetReleaseByTag,
  mockUpdateRelease,
  mockCreateRelease,
  mockPaginate,
  mockListPulls,
  mockContextRepo,
  mockConfigGet,
} from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import axios from "axios";
import { getVersionFromBranch } from "../src/shared";
import { makePushContext } from "./fixtures/contexts/push";
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Release Drafter", () => {
  beforeEach(() => {
    mockCreateRelease.mockReset();
    mockGetReleaseByTag.mockReset();
    mockUpdateRelease.mockReset();
    mockPaginate.mockReset();
    mockListPulls.mockReset();
    mockedAxios.get.mockReset();
    jest.resetModules();
  });

  beforeAll(() => {
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(
      makeConfigReponse({ release_drafter: true })
    );
  });

  test("doesn't run on non-versioned branches", async () => {
    await new ReleaseDrafter(makePushContext({ ref: "main" })).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on invalid version branches", async () => {
    mockedAxios.get.mockResolvedValue({ data: {stable: {version: "21.04"}, nightly:{version: "21.06"}, legacy:{version: "21.02"}} });
    await new ReleaseDrafter(makePushContext({
      ref: 'branch-0.13',
      default_branch: 'branch-0.13'
    })).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on created/deleted pushes", async () => {
    await new ReleaseDrafter(makePushContext({ created: true })).draftRelease();
    await new ReleaseDrafter(makePushContext({ deleted: true })).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test.each([
    makePushContext(), 
    makePushContext({
      ref: 'branch-21.04'
    }), 
    makePushContext({
      ref: 'branch-21.02'
    })
  ])("update existing release", async (branch) => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockResolvedValueOnce(getReleaseByTagResp);
    mockedAxios.get.mockResolvedValueOnce({ data: {stable: {version: "21.04"}, nightly:{version: "21.06"}, legacy:{version: "21.02"}} });

    await new ReleaseDrafter(branch).draftRelease();

    if(branch.payload.ref != "branch-21.06") {
      expect(mockedAxios.get).toHaveBeenCalledWith("https://raw.githubusercontent.com/rapidsai/docs/gh-pages/_data/releases.json");
    }
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockGetReleaseByTag).toHaveBeenCalledTimes(1);
    expect(mockGetReleaseByTag.mock.calls[0][0].tag).toBe(`v${getVersionFromBranch(branch.payload.ref)}.00a`);
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(mockUpdateRelease.mock.calls[0][0].release_id).toBe(1);
    expect(mockUpdateRelease.mock.calls[0][0].body).toBe(
      `\
## 🔗 Links

- [Development Branch](https://github.com/rapidsai/cudf/tree/${branch.payload.ref})
- [Compare with \`main\` branch](https://github.com/rapidsai/cudf/compare/main...${branch.payload.ref})

## 🚨 Breaking Changes

- Some PR title (#1234) @octokit

## 🐛 Bug Fixes

- Some PR title (#1234) @octokit

## 📖 Documentation

- Some Doc PR (#456) @ajschmidt8\
`
    );
  });

  test.each([
    makePushContext(), 
    makePushContext({
      ref: 'branch-21.04'
    }), 
    makePushContext({
      ref: 'branch-21.02'
    })
  ])("create new release", async (branch) => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockRejectedValueOnce("");
    mockedAxios.get.mockResolvedValueOnce({ data: {stable: {version: "21.04"}, nightly:{version: "21.06"}, legacy:{version: "21.02"}} });

    await new ReleaseDrafter(branch).draftRelease();

    if(branch.payload.ref != "branch-21.06") {
      expect(mockedAxios.get).toHaveBeenCalledWith("https://raw.githubusercontent.com/rapidsai/docs/gh-pages/_data/releases.json");
    }
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockGetReleaseByTag).toHaveBeenCalledTimes(1);
    expect(mockGetReleaseByTag.mock.calls[0][0].tag).toBe(`v${getVersionFromBranch(branch.payload.ref)}.00a`);
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease.mock.calls[0][0].body).toBe(
      `\
## 🔗 Links

- [Development Branch](https://github.com/rapidsai/cudf/tree/${branch.payload.ref})
- [Compare with \`main\` branch](https://github.com/rapidsai/cudf/compare/main...${branch.payload.ref})

## 🚨 Breaking Changes

- Some PR title (#1234) @octokit

## 🐛 Bug Fixes

- Some PR title (#1234) @octokit

## 📖 Documentation

- Some Doc PR (#456) @ajschmidt8\
`
    );
  });
});
