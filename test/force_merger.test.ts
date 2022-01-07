import { ForceMerger } from "../src/plugins/ForceMerger/force_merger";
import * as issueContext from "./fixtures/contexts/issue_comment";
import { data as list_commits } from "./fixtures/responses/list_commits.json";
import { default as list_reviews } from "./fixtures/responses/list_reviews.json";
import { default as pulls_get } from "./fixtures/responses/pulls_get.json";
import { user, userNoName } from "./fixtures/responses/get_by_username";
import { opsTeamMember, nonOpsTeamMember } from "./fixtures/responses/get_membership_for_user_in_org";
import {
  mockGetByUsername,
  mockTeamMembership,
  mockMerge,
  mockPaginate,
  mockPullsGet,
} from "./mocks";

describe("Force Merger", () => {
  beforeEach(() => {
    mockGetByUsername.mockReset();
    mockTeamMembership.mockReset();
    mockMerge.mockReset();
    mockPaginate.mockReset();
    mockPullsGet.mockReset();
  });

  test("force-merge comment is-ops-member", async () => {
    mockTeamMembership.mockResolvedValueOnce(opsTeamMember);
    mockPullsGet.mockResolvedValueOnce(pulls_get);
    mockPaginate.mockResolvedValueOnce(list_commits); // listCommits in getAuthors
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
    mockTeamMembership.mockResolvedValueOnce(nonOpsTeamMember);
    await new ForceMerger(issueContext.prCommentForceMerge).maybeMergePR();

    expect(mockPullsGet).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
  });

  test.each([
    ["not from PR", issueContext.nonPrComment],
    ["non-force-merge comment", issueContext.prCommentNoMerge],
  ])("issue_comment context - %s", async (_, context) => {
    await new ForceMerger(context).maybeMergePR();

    expect(mockGetByUsername).toBeCalledTimes(0);
    expect(mockTeamMembership).toBeCalledTimes(0);
    expect(mockMerge).toBeCalledTimes(0);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockPullsGet).toBeCalledTimes(0);
  });
});
