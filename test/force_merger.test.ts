import { ForceMerger } from "../src/plugins/ForceMerger/force_merger";
import * as issueContext from "./fixtures/contexts/issue_comment";
import { default as list_comments } from "./fixtures/responses/list_comments.json";
import { data as list_commits } from "./fixtures/responses/list_commits.json";
import { default as list_reviews } from "./fixtures/responses/list_reviews.json";
import { default as pulls_get } from "./fixtures/responses/pulls_get.json";
import { default as non_ops_member_user } from "./fixtures/responses/non_ops_team_member.json";
import { default as ops_member_user } from "./fixtures/responses/ops_team_member.json";
import { default as commitPRs } from "./fixtures/responses/list_pull_requests_associated_with_commit.json";
import { user, userNoName } from "./fixtures/responses/get_by_username";
import {
  mockGetByUsername,
  mockTeamMembership,
  mockListComments,
  mockListPullRequestsFromCommit,
  mockListReviews,
  mockMerge,
  mockPaginate,
  mockPullsGet,
} from "./mocks";

describe("Force Merger", () => {
  beforeEach(() => {
    mockGetByUsername.mockReset();
    mockTeamMembership.mockReset();
    mockListComments.mockReset();
    mockListPullRequestsFromCommit.mockReset();
    mockListReviews.mockReset();
    mockMerge.mockReset();
    mockPaginate.mockReset();
    mockPullsGet.mockReset();
  });

  test("force-merge comment is-ops-member", async () => {
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRs);
    mockPullsGet.mockResolvedValueOnce(pulls_get);
    mockPaginate.mockResolvedValueOnce(list_comments); // listComments in checkForValidForceMergeComment
    mockTeamMembership.mockResolvedValueOnce(ops_member_user);
    mockGetByUsername.mockResolvedValueOnce(userNoName);
    mockPaginate.mockResolvedValueOnce(list_reviews); // listReviews in getApprovers
    mockGetByUsername.mockResolvedValueOnce(user);
    await new ForceMerger(issueContext.prCommentForceMerge).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(1);
    expect(mockPullsGet.mock.calls[0][0].pull_number).toBe(468);

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

  test("force-merge comment not-ops-member", async () => {
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRs);
    mockPullsGet.mockResolvedValueOnce(pulls_get);
    mockPaginate.mockResolvedValueOnce(list_comments); // listComments in checkForValidForceMergeComment
    mockTeamMembership.mockResolvedValueOnce(non_ops_member_user);
    mockPaginate.mockResolvedValueOnce(list_commits); // listCommits in getAuthors
    mockGetByUsername.mockResolvedValueOnce(userNoName);
    mockPaginate.mockResolvedValueOnce(list_reviews); // listReviews in getApprovers
    mockGetByUsername.mockResolvedValueOnce(user);
    await new ForceMerger(issueContext.prCommentForceMerge).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(1);
    expect(mockPullsGet.mock.calls[0][0].pull_number).toBe(468);

    expect(mockMerge.mock.calls.length == 0);
  });

  test.each([
    ["not from PR", issueContext.nonPrComment],
    ["non-force-merge comment", issueContext.prCommentNoMerge],
  ])("issue_comment context - %s", async (_, context) => {
    await new ForceMerger(context).maybeMergePR();

    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockTeamMembership).toBeCalledTimes(0);
    expect(mockListComments).toBeCalledTimes(0);
    expect(mockListPullRequestsFromCommit).toBeCalledTimes(0);
    expect(mockListReviews).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockPullsGet).toBeCalledTimes(0);
  });
});