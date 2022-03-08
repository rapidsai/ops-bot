import { Context } from "probot";
import { Repository } from "@octokit/webhooks-types";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";

export type PRContext = Context<"pull_request">;
export type PushContext = Context<"push">;
export type IssueCommentContext = Context<"issue_comment">;
export type PRReviewContext = Context<"pull_request_review">;
export type StatusContext = Context<"status">;
export type RepositoryContext = Context<"repository">;
export type AutoMergerContext = Context<
  "issue_comment" | "pull_request_review" | "status"
>;
export type PullsGetResponseData =
  RestEndpointMethodTypes["pulls"]["get"]["response"]["data"];
export type PullsListResponseData =
  RestEndpointMethodTypes["pulls"]["list"]["response"]["data"];
export type UsersGetByUsernameResponseData =
  RestEndpointMethodTypes["users"]["getByUsername"]["response"]["data"];
export type ReposListCommitStatusesForRefResponseData =
  RestEndpointMethodTypes["repos"]["listCommitStatusesForRef"]["response"]["data"];
export type PayloadRepository = Repository;
export type ProbotOctokit = Context["octokit"];

export type CommitStatus = {
  context: string;
  owner: string;
  repo: string;
  sha: string;
  target_url?: string;
};
