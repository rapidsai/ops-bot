import { ForceMerger } from "../src/plugins/ForceMerger/force_merger";
import * as issueContext from "./fixtures/contexts/issue_comment";
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

describe("Force Merger", () => {
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

  test.each([
    ["not from PR", issueContext.nonPrComment],
    ["non-merge comment", issueContext.prCommentNoMerge],
  ])("issue_comment context - %s", async (_, context) => {
    await new ForceMerger(context).maybeMergePR();

    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockGetUserPermissionLevel).toBeCalledTimes(0);
    expect(mockListComments).toBeCalledTimes(0);
    expect(mockListPullRequestsFromCommit).toBeCalledTimes(0);
    expect(mockListReviews).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockPullsGet).toBeCalledTimes(0);
  });
});
