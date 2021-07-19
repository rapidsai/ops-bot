import { Context } from "probot";
import { EventPayloads } from "@octokit/webhooks";
// Need to import nested @octokit/types due to type inconsistencies w/ versions
import type {
  PullsGetResponseData,
  UsersGetByUsernameResponseData,
  PullsListResponseData,
  ReposListCommitStatusesForRefResponseData,
} from "@octokit/plugin-rest-endpoint-methods/node_modules/@octokit/types/";

export type PRContext = Context<EventPayloads.WebhookPayloadPullRequest>;
export type PushContext = Context<EventPayloads.WebhookPayloadPush>;
export type IssueCommentContext = Context<EventPayloads.WebhookPayloadIssueComment>;
export type PRReviewContext = Context<EventPayloads.WebhookPayloadPullRequestReview>;
export type StatusContext = Context<EventPayloads.WebhookPayloadStatus>;
export type RepositoryContext = Context<EventPayloads.WebhookPayloadRepository>;
export type AutoMergerContext =
  | IssueCommentContext
  | PRReviewContext
  | StatusContext;
export type {
  PullsGetResponseData,
  PullsListResponseData,
  UsersGetByUsernameResponseData,
  ReposListCommitStatusesForRefResponseData,
};
export type PayloadRepository = EventPayloads.PayloadRepository;
export type ProbotOctokit = Context["octokit"];

export type CommitStatus = {
  context: string;
  owner: string;
  repo: string;
  sha: string;
  target_url?: string;
};
