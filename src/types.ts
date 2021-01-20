import { Context } from "probot";
import { EventPayloads } from "@octokit/webhooks";
// Need to import nested @octokit/types due to type inconsistencies w/ versions
import type {
  PullsGetResponseData,
  UsersGetByUsernameResponseData,
} from "@octokit/plugin-rest-endpoint-methods/node_modules/@octokit/types/";

export type PRContext = Context<EventPayloads.WebhookPayloadPullRequest>;
export type PushContext = Context<EventPayloads.WebhookPayloadPush>;
export type IssueCommentContext = Context<EventPayloads.WebhookPayloadIssueComment>;
export type PRReviewContext = Context<EventPayloads.WebhookPayloadPullRequestReview>;
export type StatusContext = Context<EventPayloads.WebhookPayloadStatus>;
export type AutoMergerContext =
  | IssueCommentContext
  | PRReviewContext
  | StatusContext;
export type { PullsGetResponseData, UsersGetByUsernameResponseData };
