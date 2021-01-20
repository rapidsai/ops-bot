import { makeContext } from "./base";
import { IssueCommentContext } from "../../../src/types";
type RespParams = {
  is_pr?: boolean;
  body?: string;
};

const makeIssueCommentContext = ({
  is_pr = false,
  body = "some random text",
}: RespParams = {}): IssueCommentContext => {
  const payload = {
    issue: {
      number: 468,
    },
    comment: {
      body,
    },
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      owner: {
        login: "rapidsai",
      },
    },
  };

  if (is_pr) payload.issue["pull_request"] = {};

  return (makeContext(
    payload,
    "issue_comment.created"
  ) as unknown) as IssueCommentContext;
};

export const nonPrComment = makeIssueCommentContext({ is_pr: false });
export const prCommentNoMerge = makeIssueCommentContext({ is_pr: true });
