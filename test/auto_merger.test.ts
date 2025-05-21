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

import { AutoMerger } from "../src/plugins/AutoMerger/auto_merger.ts";
import * as statusContext from "./fixtures/contexts/status.ts";
import * as issueContext from "./fixtures/contexts/issue_comment.ts";
import * as prReviewContext from "./fixtures/contexts/pull_request_review.ts";
import { default as list_comments } from "./fixtures/responses/list_comments.json";
import { data as list_commits } from "./fixtures/responses/list_commits.json";
import { default as list_reviews } from "./fixtures/responses/list_reviews.json";
import { makeResponse as makePullResponse } from "./fixtures/responses/pulls_get.ts";
import { default as user_permission } from "./fixtures/responses/get_collaborator_permission_level.json";
import { default as commitPRs } from "./fixtures/responses/search_issues_and_pull_requests.json";
import { user, userNoName } from "./fixtures/responses/get_by_username.ts";
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateComment,
  mockGetByUsername,
  mockGetUserPermissionLevel,
  mockListComments,
  mockSearchIssuesAndPullRequests,
  mockListReviews,
  mockMerge,
  mockPaginate,
  mockPullsGet,
} from "./mocks.ts";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config.ts";
import { PullsGetResponseData } from "../src/types.ts";

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
    mockCreateComment.mockReset();
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
    mockGetByUsername.mockRejectedValueOnce(null);

    await new AutoMerger(statusContext.successStatus).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(1);
    expect(mockPullsGet.mock.calls[0][0].pull_number).toBe(1234);
    expect(mockGetByUsername).toBeCalledTimes(4);

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
    mockGetByUsername.mockRejectedValueOnce(null);

    await new AutoMerger(statusContext.successStatus).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(1);
    expect(mockPullsGet.mock.calls[0][0].pull_number).toBe(1234);
    expect(mockGetByUsername).toBeCalledTimes(4);

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

  describe("validateMergeRequest", () => {
    let autoMerger: AutoMerger;

    beforeEach(() => {
      autoMerger = new AutoMerger(statusContext.successStatus);
      mockCreateComment.mockReset();
    });

    test("reject when PR is authored by rapids-bot", async () => {
      const pr = {
        number: 1234,
        user: { login: "rapids-bot[bot]" }
      } as unknown as PullsGetResponseData;

      const result = await autoMerger.validateMergeRequest(pr, "squash", "/merge");
      
      expect(result).toBe(false);
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: "rapidsai",
        repo: "cudf",
        issue_number: 1234,
        body: expect.stringContaining("AutoMerger commands (like `/merge` or `/merge nosquash`) cannot be used directly on PRs authored by bots.")
      });
    });

    test("reject when PR is authored by GPUTester", async () => {
      const pr = {
        number: 1234,
        user: { login: "GPUTester" }
      } as unknown as PullsGetResponseData;

      const result = await autoMerger.validateMergeRequest(pr, "squash", "/merge");
      
      expect(result).toBe(false);
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: "rapidsai",
        repo: "cudf",
        issue_number: 1234,
        body: expect.stringContaining("AutoMerger commands (like `/merge` or `/merge nosquash`) cannot be used directly on PRs authored by bots.")
      });
    });

    test("reject when squash merge on forward-merge branch", async () => {
      const pr = {
        number: 1234,
        user: { login: "normal-user" },
        head: { ref: "branch-25.06-merge-branch-25.04" }
      } as unknown as PullsGetResponseData;

      const result = await autoMerger.validateMergeRequest(pr, "squash", "/merge");
      
      expect(result).toBe(false);
      expect(mockCreateComment).toHaveBeenCalledWith({
        owner: "rapidsai",
        repo: "cudf",
        issue_number: 1234,
        body: expect.stringContaining("This PR appears to be a manual resolution for a forward-merge.")
      });
    });

    test("allow nosquash merge on forward-merge branch", async () => {
      const pr = {
        number: 1234,
        user: { login: "normal-user" },
        head: { ref: "branch-25.06-merge-branch-25.04" }
      } as unknown as PullsGetResponseData;

      const result = await autoMerger.validateMergeRequest(pr, "merge", "/merge nosquash");
      
      expect(result).toBe(true);
      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    test("allow regular merge for normal PR", async () => {
      const pr = {
        number: 1234,
        user: { login: "normal-user" },
        head: { ref: "feature-branch" }
      } as unknown as PullsGetResponseData;

      const result = await autoMerger.validateMergeRequest(pr, "squash", "/merge");
      
      expect(result).toBe(true);
      expect(mockCreateComment).not.toHaveBeenCalled();
    });
  });

  describe("getValidMergeComment", () => {
    let autoMerger: AutoMerger;

    beforeEach(() => {
      autoMerger = new AutoMerger(statusContext.successStatus);
      mockPaginate.mockReset();
      mockGetUserPermissionLevel.mockReset();
    });

    test("should return null when no merge comments", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);

      const result = await autoMerger.getValidMergeComment(pr);
      
      expect(result).toBeNull();
      expect(mockPaginate).toHaveBeenCalledTimes(1);
      expect(mockGetUserPermissionLevel).not.toHaveBeenCalled();
    });

    test("should return null when users don't have required permissions", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments = [
        { 
          body: "/merge",
          user: { login: "unauthorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ];
      mockPaginate.mockResolvedValueOnce(comments);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "read" } });

      const result = await autoMerger.getValidMergeComment(pr);
      
      expect(result).toBeNull();
      expect(mockPaginate).toHaveBeenCalledTimes(1);
      expect(mockGetUserPermissionLevel).toHaveBeenCalledTimes(1);
    });

    test("should return squash method for /merge comment with proper permissions", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments = [
        { 
          body: "/merge",
          user: { login: "authorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ];
      mockPaginate.mockResolvedValueOnce(comments);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });

      const result = await autoMerger.getValidMergeComment(pr);
      
      expect(result).toEqual({ mergeMethod: "squash", commentBody: "/merge" });
      expect(mockPaginate).toHaveBeenCalledTimes(1);
      expect(mockGetUserPermissionLevel).toHaveBeenCalledTimes(1);
    });

    test("should return merge method for /merge nosquash comment with proper permissions", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments = [
        { 
          body: "/merge nosquash",
          user: { login: "authorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ];
      mockPaginate.mockResolvedValueOnce(comments);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });

      const result = await autoMerger.getValidMergeComment(pr);
      
      expect(result).toEqual({ mergeMethod: "merge", commentBody: "/merge nosquash" });
      expect(mockPaginate).toHaveBeenCalledTimes(1);
      expect(mockGetUserPermissionLevel).toHaveBeenCalledTimes(1);
    });

    test("should process comments from newest to oldest", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments = [
        { 
          body: "/merge",
          user: { login: "authorized-user1" },
          created_at: "2023-01-01T10:00:00Z"
        },
        { 
          body: "/merge nosquash",
          user: { login: "authorized-user2" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ];
      mockPaginate.mockResolvedValueOnce(comments);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });

      const result = await autoMerger.getValidMergeComment(pr);
      
      expect(result).toEqual({ mergeMethod: "merge", commentBody: "/merge nosquash" });
      expect(mockPaginate).toHaveBeenCalledTimes(1);
      expect(mockGetUserPermissionLevel).toHaveBeenCalledTimes(1);
    });

    test("should handle command with leading/trailing whitespace", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments = [
        { 
          body: "  /merge  ",
          user: { login: "authorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ];
      mockPaginate.mockResolvedValueOnce(comments);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });

      const result = await autoMerger.getValidMergeComment(pr);
      
      expect(result).toEqual({ mergeMethod: "squash", commentBody: "  /merge  " });
    });
  });

  describe("validateNoSquashMerge", () => {
    let autoMerger: AutoMerger;

    beforeEach(() => {
      autoMerger = new AutoMerger(statusContext.successStatus);
      mockPaginate.mockReset();
      mockSearchIssuesAndPullRequests.mockReset();
      mockPullsGet.mockReset();
    });

    test("should fail if permanent validation failure exists", async () => {
      const pr = makePullResponse().data as unknown as PullsGetResponseData;
      const comments = [
        { 
          body: "This PR has failed nosquash validation checks: Some failure message",
          user: { login: "ops-bot" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ];
      mockPaginate.mockResolvedValueOnce(comments);

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("This PR has previously failed nosquash validation checks");
      expect(result.isFixableError).toBe(false);
    });

    test("should fail for invalid branch name", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "invalid-branch-name" }
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Could not determine original ForwardMerger PR from branch name");
      expect(result.isFixableError).toBe(true);
    });

    test("should fail when no matching bot PRs found", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" }
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({ data: { items: [] } });

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Could not find any open bot-authored PRs");
    });

    test("should fail when multiple matching bot PRs found", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" }
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [
            { number: 1234 },
            { number: 5678 }
          ]
        }
      });

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Found multiple (2) open bot-authored PRs");
    });

    test("should fail when original PR is not from a bot", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" }
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "normal-user" }
        }
      });

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Original PR #1234 was not authored by a known bot account");
    });

    test("should fail when base branches don't match", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" },
        base: { ref: "branch-25.06" }
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "rapids-bot[bot]" },
          base: { ref: "different-branch" }
        }
      });

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Base branch of this PR (branch-25.06) does not match the base branch of original PR");
      expect(result.isFixableError).toBe(true);
    });

    test("should fail when commit history doesn't match", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" },
        base: { ref: "branch-25.06" },
        number: 5678
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "rapids-bot[bot]" },
          base: { ref: "branch-25.06" }
        }
      });
      
      // Original PR commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" }
      ]);
      
      // Current PR commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit3" } // Different commit
      ]);

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Commit history integrity check failed");
      expect(result.isFixableError).toBe(true);
    });

    test("should succeed when all validation passes", async () => {
      const pr = {
        ...makePullResponse().data,
        head: { ref: "main-merge-release/25.06" },
        base: { ref: "main" },
        number: 5678
      } as unknown as PullsGetResponseData;
      const comments: any[] = [];
      mockPaginate.mockResolvedValueOnce(comments);
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "rapids-bot[bot]" },
          base: { ref: "main" }
        }
      });
      
      // Original PR commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" }
      ]);
      
      // Current PR commits - includes all original commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" },
        { sha: "commit3" } // Extra commit is fine
      ]);

      const result = await autoMerger.validateNoSquashMerge(pr);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain("Validation successful");
    });

    test("should implement lock-out after non-fixable validation failure", async () => {
      // First validation - will fail with non-fixable error
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" },
        base: { ref: "branch-25.06" },
        number: 5678
      } as unknown as PullsGetResponseData;
      
      // Initial check has empty comments - no previous failures
      mockPaginate.mockResolvedValueOnce([]);
      
      // Search returns multiple PRs - causing a non-fixable validation failure
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }, { number: 5678 }]
        }
      });
      
      const firstResult = await autoMerger.validateNoSquashMerge(pr);
      expect(firstResult.success).toBe(false);
      expect(firstResult.message).toContain("Found multiple");
      
      // Reset mocks for second validation attempt
      mockPaginate.mockReset();
      mockSearchIssuesAndPullRequests.mockReset();
      
      // Second validation - comments now include the previous failure
      mockPaginate.mockResolvedValueOnce([{
        body: "This PR has failed nosquash validation checks: Found multiple (2) open bot-authored PRs",
        user: { login: "ops-bot" }
      }]);
      
      // Even if search would now return valid result, it should be locked out
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      
      const secondResult = await autoMerger.validateNoSquashMerge(pr);
      expect(secondResult.success).toBe(false);
      expect(secondResult.message).toContain("This PR has previously failed nosquash validation checks");
      expect(secondResult.isFixableError).toBe(false);
      
      // Verify search wasn't even called on second attempt due to lock-out
      expect(mockSearchIssuesAndPullRequests).not.toHaveBeenCalled();
    });
    
    test("should allow retry after fixable validation failure", async () => {
      // First validation - will fail with fixable error (commit history)
      const pr = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" },
        base: { ref: "branch-25.06" },
        number: 5678
      } as unknown as PullsGetResponseData;
      
      // Initial check has empty comments - no previous failures
      mockPaginate.mockResolvedValueOnce([]);
      
      // Search returns a valid PR
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      
      // Get the original PR
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "rapids-bot[bot]" },
          base: { ref: "branch-25.06" }
        }
      });
      
      // Original PR commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" }
      ]);
      
      // Current PR commits - missing one of the original commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" }
        // commit2 is missing - causing fixable validation failure
      ]);
      
      const firstResult = await autoMerger.validateNoSquashMerge(pr);
      expect(firstResult.success).toBe(false);
      expect(firstResult.message).toContain("Commit history integrity check failed");
      expect(firstResult.isFixableError).toBe(true);
      
      // Reset mocks for second validation attempt
      mockPaginate.mockReset();
      mockSearchIssuesAndPullRequests.mockReset();
      mockPullsGet.mockReset();
      
      // Second validation - comments don't include a permanent failure marker
      // for fixable errors we don't use the failure prefix that triggers lock-out
      mockPaginate.mockResolvedValueOnce([{
        body: "Commit history integrity check failed. This PR is missing some commits from the original PR #1234.",
        user: { login: "ops-bot" }
      }]);
      
      // Search returns the same valid PR
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      
      // Get the original PR again
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "rapids-bot[bot]" },
          base: { ref: "branch-25.06" }
        }
      });
      
      // Original PR commits still the same
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" }
      ]);
      
      // Current PR commits - now has all the commits (fixed)
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" }
      ]);
      
      const secondResult = await autoMerger.validateNoSquashMerge(pr);
      expect(secondResult.success).toBe(true);
      expect(secondResult.message).toContain("Validation successful");
    });
  });

  describe("hasPermanentNosquashValidationFailure", () => {
    let autoMerger: AutoMerger;

    beforeEach(() => {
      autoMerger = new AutoMerger(statusContext.successStatus);
    });

    test("should return true when failure comment exists", () => {
      const comments = [
        { body: "This PR has failed nosquash validation checks: Some failure message" },
        { body: "Some other comment" }
      ];

      const result = (autoMerger as any).hasPermanentNosquashValidationFailure(comments);
      
      expect(result).toBe(true);
    });

    test("should return false when no failure comments exist", () => {
      const comments = [
        { body: "This is a regular comment" },
        { body: "Another regular comment" }
      ];

      const result = (autoMerger as any).hasPermanentNosquashValidationFailure(comments);
      
      expect(result).toBe(false);
    });

    test("should return false for empty comments array", () => {
      const comments: any[] = [];

      const result = (autoMerger as any).hasPermanentNosquashValidationFailure(comments);
      
      expect(result).toBe(false);
    });
  });
  
  describe("isPrMergeable", () => {
    let autoMerger: AutoMerger;

    beforeEach(() => {
      autoMerger = new AutoMerger(statusContext.successStatus);
    });

    test("should return true for mergeable PR to default branch", () => {
      const pr = {
        mergeable_state: "clean",
        mergeable: true,
        base: { ref: "main" }
      } as unknown as PullsGetResponseData;

      const result = autoMerger.isPrMergeable(pr, "main");
      
      expect(result).toBe(true);
    });

    test("should return true for unstable but mergeable PR to default branch", () => {
      const pr = {
        mergeable_state: "unstable",
        mergeable: true,
        base: { ref: "main" }
      } as unknown as PullsGetResponseData;

      const result = autoMerger.isPrMergeable(pr, "main");
      
      expect(result).toBe(true);
    });

    test("should return true for mergeable PR to non-main branch", () => {
      const pr = {
        mergeable_state: "clean",
        mergeable: true,
        base: { ref: "feature-branch" }
      } as unknown as PullsGetResponseData;

      const result = autoMerger.isPrMergeable(pr, "main");
      
      expect(result).toBe(true);
    });

    test("should return false for non-mergeable PR", () => {
      const pr = {
        mergeable_state: "dirty",
        mergeable: false,
        base: { ref: "main" }
      } as unknown as PullsGetResponseData;

      const result = autoMerger.isPrMergeable(pr, "main");
      
      expect(result).toBe(false);
    });

    test("should return false for PR to main when main is not default", () => {
      const pr = {
        mergeable_state: "clean",
        mergeable: true,
        base: { ref: "main" }
      } as unknown as PullsGetResponseData;

      const result = autoMerger.isPrMergeable(pr, "branch-25.06");
      
      expect(result).toBe(false);
    });
  });

  describe("Merge Parameter Selection", () => {
    beforeEach(() => {
      mockMerge.mockReset();
      mockPaginate.mockReset();
      mockGetByUsername.mockReset();
      mockPullsGet.mockReset();
      mockGetUserPermissionLevel.mockReset();
      mockCreateComment.mockReset();
      mockSearchIssuesAndPullRequests.mockReset();
    });

    test("should set squash parameters for default /merge command", async () => {
      // Setup
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce(commitPRs);
      mockPullsGet.mockResolvedValueOnce(makePullResponse());
      
      // Mock a valid /merge comment
      mockPaginate.mockResolvedValueOnce([
        { 
          body: "/merge",
          user: { login: "authorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ]);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });
      
      // Mock author/approver data
      mockPaginate.mockResolvedValueOnce(list_commits); // For getAuthors
      mockGetByUsername.mockResolvedValueOnce(userNoName);
      mockGetByUsername.mockRejectedValueOnce(null);
      mockPaginate.mockResolvedValueOnce(list_reviews); // For getApprovers
      mockGetByUsername.mockResolvedValueOnce(user);
      mockGetByUsername.mockRejectedValueOnce(null);
      
      // Execute
      await new AutoMerger(statusContext.successStatus).maybeMergePR();
      
      // Verify
      expect(mockMerge).toHaveBeenCalledTimes(1);
      expect(mockMerge.mock.calls[0][0]).toMatchObject({
        owner: "rapidsai",
        repo: "cudf",
        pull_number: 1234,
        merge_method: "squash",
        commit_title: expect.any(String),
        commit_message: expect.any(String)
      });
      
      // Verify commit_title and commit_message are set correctly for squash
      const callParams = mockMerge.mock.calls[0][0];
      expect(callParams.commit_title).toContain("[REVIEW]");
      expect(callParams.commit_message).toContain("Authors:");
      expect(callParams.commit_message).toContain("Approvers:");
    });

    test("should set merge parameters for /merge nosquash command", async () => {
      // Setup
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce(commitPRs);
      
      // Create a PR object with a forward-merge branch name pattern
      const prData = {
        ...makePullResponse().data,
        head: { ref: "branch-25.06-merge-branch-25.04" },
        number: 5678,
        base: { ref: "branch-25.06" },
        mergeable: true,
        mergeable_state: "clean"
      };
      mockPullsGet.mockResolvedValueOnce({
        data: prData
      });
      
      // Mock a valid /merge nosquash comment with exact format
      mockPaginate.mockResolvedValueOnce([
        { 
          body: "/merge nosquash",
          user: { login: "authorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ]);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });
      
      // Mock validateNoSquashMerge requirements
      mockPaginate.mockResolvedValueOnce([]); // No previous failure comments
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{ number: 1234 }]
        }
      });
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          user: { login: "rapids-bot[bot]" },
          base: { ref: "branch-25.06" }
        }
      });
      
      // Original PR commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" }
      ]);
      
      // Current PR commits - include all original commits
      mockPaginate.mockResolvedValueOnce([
        { sha: "commit1" },
        { sha: "commit2" },
        { sha: "commit3" } // Extra commit is fine
      ]);
      
      // Mock the merge success
      mockMerge.mockResolvedValueOnce({});
      
      // Execute
      await new AutoMerger(statusContext.successStatus).maybeMergePR();
      
      // Verify
      expect(mockMerge).toHaveBeenCalledTimes(1);
      expect(mockMerge.mock.calls[0][0]).toMatchObject({
        owner: "rapidsai",
        repo: "cudf",
        pull_number: 5678,
        merge_method: "merge"
      });
      
      // Verify commit_title and commit_message are undefined for merge
      const callParams = mockMerge.mock.calls[0][0];
      expect(callParams.commit_title).toBeUndefined();
      expect(callParams.commit_message).toBeUndefined();
    });
    
    test("should handle merge failure by posting comment", async () => {
      // Setup
      mockSearchIssuesAndPullRequests.mockResolvedValueOnce(commitPRs);
      mockPullsGet.mockResolvedValueOnce({
        data: {
          ...makePullResponse().data,
          number: 5678
        }
      });
      
      // Mock a valid /merge comment
      mockPaginate.mockResolvedValueOnce([
        { 
          body: "/merge",
          user: { login: "authorized-user" },
          created_at: "2023-01-01T12:00:00Z"
        }
      ]);
      mockGetUserPermissionLevel.mockResolvedValueOnce({ data: { permission: "write" } });
      
      // Mock author/approver data
      mockPaginate.mockResolvedValueOnce(list_commits); // For getAuthors
      mockGetByUsername.mockResolvedValueOnce(userNoName);
      mockGetByUsername.mockRejectedValueOnce(null);
      mockPaginate.mockResolvedValueOnce(list_reviews); // For getApprovers
      mockGetByUsername.mockResolvedValueOnce(user);
      mockGetByUsername.mockRejectedValueOnce(null);
      
      // Mock a merge failure
      mockMerge.mockRejectedValueOnce(new Error("Merge conflict detected"));
      mockCreateComment.mockResolvedValueOnce({});
      
      // Execute
      await new AutoMerger(statusContext.successStatus).maybeMergePR();
      
      // Verify that an error comment was posted
      expect(mockCreateComment).toHaveBeenCalledTimes(1);
      expect(mockCreateComment.mock.calls[0][0]).toMatchObject({
        owner: "rapidsai",
        repo: "cudf",
        issue_number: 5678,
        body: expect.stringContaining("Failed to merge")
      });
    });
  });
});
