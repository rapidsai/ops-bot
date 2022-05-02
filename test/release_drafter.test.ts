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
import * as context from "./fixtures/contexts/push";
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

describe("Release Drafter", () => {
  beforeEach(() => {
    mockCreateRelease.mockReset();
    mockGetReleaseByTag.mockReset();
    mockUpdateRelease.mockReset();
    mockPaginate.mockReset();
    mockListPulls.mockReset();
  });

  beforeAll(() => {
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(
      makeConfigReponse({ release_drafter: true })
    );
  });

  test("doesn't run on non-versioned branches", async () => {
    await new ReleaseDrafter(context.nonVersionedBranch).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on invalid version branches", async () => {
    await new ReleaseDrafter(context.invalidVersionedBranch).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on created/deleted pushes", async () => {
    await new ReleaseDrafter(context.createdPush).draftRelease();
    await new ReleaseDrafter(context.deletedPush).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("update existing release", async () => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockResolvedValueOnce(getReleaseByTagResp);
    await new ReleaseDrafter(context.validBranch).draftRelease();
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockGetReleaseByTag).toHaveBeenCalledTimes(1);
    expect(mockGetReleaseByTag.mock.calls[0][0].tag).toBe("v21.06.00a");
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(mockUpdateRelease.mock.calls[0][0].release_id).toBe(1);
    expect(mockUpdateRelease.mock.calls[0][0].body).toBe(
      `\
## 🔗 Links

- [Development Branch](https://github.com/rapidsai/cudf/tree/branch-21.06)
- [Compare with \`main\` branch](https://github.com/rapidsai/cudf/compare/main...branch-21.06)

## 🚨 Breaking Changes

- Some PR title (#1234) @octokit

## 🐛 Bug Fixes

- Some PR title (#1234) @octokit

## 📖 Documentation

- Some Doc PR (#456) @ajschmidt8\
`
    );
  });

  test("create new release", async () => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockRejectedValueOnce("");
    await new ReleaseDrafter(context.validBranch).draftRelease();
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockGetReleaseByTag).toHaveBeenCalledTimes(1);
    expect(mockGetReleaseByTag.mock.calls[0][0].tag).toBe("v21.06.00a");
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease.mock.calls[0][0].body).toBe(
      `\
## 🔗 Links

- [Development Branch](https://github.com/rapidsai/cudf/tree/branch-21.06)
- [Compare with \`main\` branch](https://github.com/rapidsai/cudf/compare/main...branch-21.06)

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
