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

import { PRRecentlyUpdated } from "../src/plugins/RecentlyUpdated/pull_request.ts";
import { PushRecentlyUpdated } from "../src/plugins/RecentlyUpdated/push.ts";
import { makePRContext } from "./fixtures/contexts/pull_request.ts";
import {
  mockCompareCommitsWithBasehead,
  mockConfigGet,
  mockContextRepo,
  mockCreateCommitStatus,
  mockListPulls,
  mockPaginate,
} from "./mocks";
import { recently_updated as listPullsResp } from "./fixtures/responses/list_pulls.json";
import { makeConfigReponse } from "./fixtures/responses/get_config.ts";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makePushContext } from "./fixtures/contexts/push.ts";
import { makeResponse } from "./fixtures/responses/compare_commits_with_basehead.ts";

describe("Recently Updated", () => {
  describe("Pull Request Event", () => {
    beforeEach(() => {
      mockCreateCommitStatus.mockReset();
      mockCompareCommitsWithBasehead.mockReset();
    });

    beforeAll(() => {
      mockContextRepo.mockReturnValue(repoResp);
      mockConfigGet.mockResolvedValue(
        makeConfigReponse({
          recently_updated: true,
          recently_updated_threshold: 5,
        })
      );
    });

    test("Forward Merge PR", async () => {
      const context = makePRContext({
        title: "Forward-merge branch-0.17 to branch-0.18 [skip ci]",
        user: "rapids-bot[bot]",
      });
      await new PRRecentlyUpdated(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
        "https://docs.rapids.ai/resources/recently-updated/"
      );
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Automated rapids-bot PR detected"
      );
    });

    test("behind by 1 commit", async () => {
      const context = makePRContext();
      mockCompareCommitsWithBasehead.mockResolvedValueOnce(
        makeResponse({ behind_by: 1 })
      );
      await new PRRecentlyUpdated(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
        "https://docs.rapids.ai/resources/recently-updated/"
      );
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "PR includes recent base branch changes"
      );
    });

    test("behind by 7 commits", async () => {
      const context = makePRContext();
      mockCompareCommitsWithBasehead.mockResolvedValueOnce(
        makeResponse({ behind_by: 7 })
      );
      await new PRRecentlyUpdated(context).checkPR();
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
      expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
        "https://docs.rapids.ai/resources/recently-updated/"
      );
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "PR is 7 commits behind base branch. Merge latest changes"
      );
    });
  });

  describe("Push Event", () => {
    beforeEach(() => {
      mockCreateCommitStatus.mockReset();
      mockPaginate.mockReset();
    });

    test("versioned branch", async () => {
      mockPaginate.mockResolvedValueOnce(listPullsResp);
      const context = makePushContext({ ref: "refs/heads/branch-22.06" });
      await new PushRecentlyUpdated(context).checkAllPRs();
      expect(mockPaginate).toBeCalledTimes(1);
      expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
      expect(mockPaginate.mock.calls[0][1]).toStrictEqual({
        owner: "Codertocat",
        repo: "cudf",
        per_page: 100,
      });
      expect(mockCreateCommitStatus).toBeCalledTimes(2);
      expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
      expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
      expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
        "https://docs.rapids.ai/resources/recently-updated/"
      );
      expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
        "Automated rapids-bot PR detected"
      );
    });

    test("non-versioned branch", async () => {
      mockPaginate.mockResolvedValueOnce(listPullsResp);
      const context = makePushContext({ ref: "refs/heads/main" });
      await new PushRecentlyUpdated(context).checkAllPRs();
      expect(mockPaginate).toBeCalledTimes(0);
      expect(mockCreateCommitStatus).toBeCalledTimes(0);
    });
  });
});
