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

import { AutoMerger } from "../src/plugins/AutoMerger/auto_merger";
import * as statusContext from "./fixtures/contexts/status";
import * as issueContext from "./fixtures/contexts/issue_comment";
import * as prReviewContext from "./fixtures/contexts/pull_request_review";
import { default as list_comments } from "./fixtures/responses/list_comments.json";
import { data as list_commits } from "./fixtures/responses/list_commits.json";
import { default as list_reviews } from "./fixtures/responses/list_reviews.json";
import { makeResponse as makePullResponse } from "./fixtures/responses/pulls_get";
import { default as user_permission } from "./fixtures/responses/get_collaborator_permission_level.json";
import { default as commitPRs } from "./fixtures/responses/search_issues_and_pull_requests.json";
import { user, userNoName } from "./fixtures/responses/get_by_username";
import {
  mockConfigGet,
  mockContextRepo,
  mockGetByUsername,
  mockGetUserPermissionLevel,
  mockListComments,
  mockSearchIssuesAndPullRequests,
  mockListReviews,
  mockMerge,
  mockPaginate,
  mockPullsGet,
} from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";

describe("Auto Merger", () => {
  beforeEach(() => {
    mockGetByUsername.mockReset();
    mockGetUserPermissionLevel.mockReset();
    mockListComments.mockReset();
    mockSearchIssuesAndPullRequests.mockReset();
    mockListReviews.mockReset();
    mockMerge.mockReset();
    mockPaginate.mockReset();
    mockPullsGet.mockReset();
  });

  beforeAll(() => {
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(makeConfigReponse({ auto_merger: true }));
  });

  test("status context", async () => {
    mockSearchIssuesAndPullRequests.mockResolvedValueOnce(commitPRs);
    mockPullsGet.mockResolvedValueOnce(makePullResponse());
    mockPaginate.mockResolvedValueOnce(list_comments); // listComments in checkForValidMergeComment
    mockGetUserPermissionLevel.mockResolvedValueOnce(user_permission);
    mockPaginate.mockResolvedValueOnce(list_commits); // listCommits in getAuthors
    mockGetByUsername.mockResolvedValueOnce(userNoName);
    mockGetByUsername.mockRejectedValueOnce(null);
    mockPaginate.mockResolvedValueOnce(list_reviews); // listReviews in getApprovers
    mockGetByUsername.mockResolvedValueOnce(user);

    await new AutoMerger(statusContext.successStatus).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(1);
    expect(mockPullsGet.mock.calls[0][0].pull_number).toBe(1234);

    expect(mockMerge.mock.calls[0][0]).toMatchObject({
      owner: "rapidsai",
      repo: "cudf",
      pull_number: 1234,
      merge_method: "squash",
      commit_title: "[REVIEW] Implement cudf.DateOffset for months (#1234)",
      commit_message: `Implements \`cudf.DateOffset\` - an object used for calendrical arithmetic, similar to pandas.DateOffset - for month units only.

Closes https://github.com/rapidsai/cudf/issues/6754

Authors:
  - https://github.com/VibhuJawa

Approvers:
  - Keith Kraus (https://github.com/kkraus14)

URL: https://github.com/rapidsai/cudf/pull/6775`,
    });
  });

  test.each([
    [
      "description only",
      "This text is skipped\n ## Description\nSample body text\n",
      "Sample body text",
    ],
    [
      "description and checklist",
      "This text is skipped\n ## description\nSample body text\n ## checklist\n- [ ] Checklist item skipped 1\n- [ ] Checklist item skipped 2\n",
      "Sample body text",
    ],
    [
      "checklist only",
      "This text is included\n \nSample body text\n ## Checklist\n- [ ] Checklist item skipped 1\n- [ ] Checklist item skipped 2\n",
      "This text is included\n \nSample body text",
    ],
  ])("PR body text test - %s", async (_, PR_body, expected_body) => {
    mockSearchIssuesAndPullRequests.mockResolvedValueOnce(commitPRs);
    mockPullsGet.mockResolvedValueOnce(makePullResponse({ body: PR_body }));
    mockPaginate.mockResolvedValueOnce(list_comments); // listComments in checkForValidMergeComment
    mockGetUserPermissionLevel.mockResolvedValueOnce(user_permission);
    mockPaginate.mockResolvedValueOnce(list_commits); // listCommits in getAuthors
    mockGetByUsername.mockResolvedValueOnce(userNoName);
    mockGetByUsername.mockRejectedValueOnce(null);
    mockPaginate.mockResolvedValueOnce(list_reviews); // listReviews in getApprovers
    mockGetByUsername.mockResolvedValueOnce(user);

    await new AutoMerger(statusContext.successStatus).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(1);
    expect(mockPullsGet.mock.calls[0][0].pull_number).toBe(1234);

    expect(mockMerge.mock.calls[0][0]).toMatchObject({
      owner: "rapidsai",
      repo: "cudf",
      pull_number: 1234,
      merge_method: "squash",
      commit_title: "[REVIEW] Implement cudf.DateOffset for months (#1234)",
      commit_message:
        expected_body +
        `

Authors:
  - https://github.com/VibhuJawa

Approvers:
  - Keith Kraus (https://github.com/kkraus14)

URL: https://github.com/rapidsai/cudf/pull/6775`,
    });
  });

  test.each([
    ["not from PR", issueContext.nonPrComment],
    ["non-merge comment", issueContext.prCommentNoMerge],
  ])("issue_comment context - %s", async (_, context) => {
    await new AutoMerger(context).maybeMergePR();

    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockGetUserPermissionLevel).toBeCalledTimes(0);
    expect(mockListComments).toBeCalledTimes(0);
    expect(mockSearchIssuesAndPullRequests).toBeCalledTimes(0);
    expect(mockListReviews).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockPullsGet).toBeCalledTimes(0);
  });

  test("pull_request_review context - not approved", async () => {
    await new AutoMerger(prReviewContext.commented).maybeMergePR();

    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockGetUserPermissionLevel).toBeCalledTimes(0);
    expect(mockListComments).toBeCalledTimes(0);
    expect(mockSearchIssuesAndPullRequests).toBeCalledTimes(0);
    expect(mockListReviews).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockPullsGet).toBeCalledTimes(0);
  });
});
