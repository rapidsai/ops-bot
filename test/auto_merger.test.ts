import { AutoMerger } from "../src/plugins/AutoMerger/auto_merger";
import * as statusContext from "./fixtures/contexts/status";
import * as issueContext from "./fixtures/contexts/issue_comment";
import * as prReviewContext from "./fixtures/contexts/pull_request_review";
import { default as list_comments } from "./fixtures/responses/list_comments.json";
import { data as list_commits } from "./fixtures/responses/list_commits.json";
import { default as list_reviews } from "./fixtures/responses/list_reviews.json";
import { default as pulls_get } from "./fixtures/responses/pulls_get.json";
import { default as user_permission } from "./fixtures/responses/get_collaborator_permission_level.json";
import { default as commitPRs } from "./fixtures/responses/list_pull_requests_associated_with_commit.json";
import { user, userNoName } from "./fixtures/responses/get_by_username";
import {
  mockGetByUsername,
  mockGetUserPermissionLevel,
  mockListComments,
  mockListPullRequestsFromCommit,
  mockListReviews,
  mockMerge,
  mockPaginate,
  mockPullsGet,
} from "./mocks";

describe("Auto Merger", () => {
  beforeEach(() => {
    mockGetByUsername.mockReset();
    mockGetUserPermissionLevel.mockReset();
    mockListComments.mockReset();
    mockListPullRequestsFromCommit.mockReset();
    mockListReviews.mockReset();
    mockMerge.mockReset();
    mockPaginate.mockReset();
    mockPullsGet.mockReset();
  });

  test("status context", async () => {
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRs);
    mockPullsGet.mockResolvedValueOnce(pulls_get);
    mockPaginate.mockResolvedValueOnce(list_comments); // listComments in checkForValidMergeComment
    mockGetUserPermissionLevel.mockResolvedValueOnce(user_permission);
    mockPaginate.mockResolvedValueOnce(list_commits); // listCommits in getAuthors
    mockGetByUsername.mockResolvedValueOnce(userNoName);
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
      commit_title: "Implement cudf.DateOffset for months (#1234)",
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
    ["not from PR", issueContext.nonPrComment],
    ["non-merge comment", issueContext.prCommentNoMerge],
  ])("issue_comment context - %s", async (_, context) => {
    await new AutoMerger(context).maybeMergePR();

    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockGetUserPermissionLevel).toBeCalledTimes(0);
    expect(mockListComments).toBeCalledTimes(0);
    expect(mockListPullRequestsFromCommit).toBeCalledTimes(0);
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
    expect(mockListPullRequestsFromCommit).toBeCalledTimes(0);
    expect(mockListReviews).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockPullsGet).toBeCalledTimes(0);
  });


  test('PR with DO NOT MERGE label', async () => {
    let mockPulls = pulls_get
    mockPulls.data.labels = <any[]> [{
      name: 'DO NOT MERGE'
    }]
    mockPullsGet.mockResolvedValueOnce(mockPulls);
    await new AutoMerger(prReviewContext.approved).maybeMergePR();

    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
  })
});
