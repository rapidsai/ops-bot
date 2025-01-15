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

import { PRBranchChecker } from "../src/plugins/BranchChecker/pull_request.ts";
import { RepositoryBranchChecker } from "../src/plugins/BranchChecker/repository.ts";
import { makePRContext } from "./fixtures/contexts/pull_request.ts";
import { makeRepositoryContext } from "./fixtures/contexts/repository.ts";
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateCommitStatus,
  mockListPulls,
  mockPaginate,
} from "./mocks.ts";
import { branch_checker as listPullsResp } from "./fixtures/responses/list_pulls.json";
import { default as releasesJson } from "./fixtures/responses/releases.json";
import axios from "axios";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config.ts";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Branch Checker", () => {
  describe("Pull Request Event", () => {
    beforeEach(() => {
      mockCreateCommitStatus.mockReset();
    });

    beforeAll(() => {
      mockContextRepo.mockReturnValue(repoResp);
      const resp = { data: releasesJson };
      mockedAxios.get.mockResolvedValue(resp);
      mockConfigGet.mockResolvedValue(
        makeConfigReponse({ branch_checker: true })
      );
    });

    test("release PR", async () => {
      const context = makePRContext({
        title: "[RELEASE] cuml v0.18",
        user: "GPUtester",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Automated GPUTester PR detected"
      );
    });

    test("non-versioned base branch", async () => {
      const context = makePRContext({
        baseRef: "not-a-versioned-branch",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("old versioned branch", async () => {
      const context = makePRContext({
        baseRef: "branch-0.15",
        baseDefaultBranch: "branch-0.18",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("default branch + 2", async () => {
      const context = makePRContext({
        baseRef: "branch-0.20",
        baseDefaultBranch: "branch-0.18",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("active development branch", async () => {
      const context = makePRContext({
        baseRef: "branch-21.06",
        baseDefaultBranch: "branch-21.06",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is under active development"
      );
    });

    test("next development branch", async () => {
      const context = makePRContext({
        baseRef: "branch-21.08",
        baseDefaultBranch: "branch-21.06",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is under active development"
      );
    });

    test("future development branch", async () => {
      const context = makePRContext({
        baseRef: "branch-21.10",
        baseDefaultBranch: "branch-21.06",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is not under active development"
      );
    });

    test("non-versioned default branch", async() => {
      const context = makePRContext({
        baseRef: "non-versioned-branch",
        baseDefaultBranch: "non-versioned-branch",
      });
      await new PRBranchChecker(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Base branch is under active development"
      );
    });
  });

  describe("Repository Event", () => {
    beforeEach(() => {
      mockCreateCommitStatus.mockReset();
      mockPaginate.mockReset();
    });

    test("release PR", async () => {
      mockPaginate.mockResolvedValueOnce(listPullsResp);
      const context = makeRepositoryContext();
      await new RepositoryBranchChecker(context).checkAllPRs();
      expect(mockPaginate).toBeCalledTimes(1);
      expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
      expect(mockPaginate.mock.calls[0][1]).toStrictEqual({
        owner: "rapidsai",
        repo: "cudf",
        per_page: 100,
      });
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Automated GPUTester PR detected"
      );
    });
  });
});
