import { Context } from "probot";
import { EventPayloads } from "@octokit/webhooks";

export type PRContext = Context<EventPayloads.WebhookPayloadPullRequest>;
export type PushContext = Context<EventPayloads.WebhookPayloadPush>;
export type IssueCommentContext = Context<EventPayloads.WebhookPayloadIssueComment>;
export type PRReviewContext = Context<EventPayloads.WebhookPayloadPullRequestReview>;
export type StatusContext = Context<EventPayloads.WebhookPayloadStatus>;
export type AutoMergerContext =
  | IssueCommentContext
  | PRReviewContext
  | StatusContext;
