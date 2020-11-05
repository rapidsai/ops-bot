import { Context } from "probot";
import { EventPayloads } from "@octokit/webhooks";

export type PRContext = Context<EventPayloads.WebhookPayloadPullRequest>;
export type PushContext = Context<EventPayloads.WebhookPayloadPush>;
