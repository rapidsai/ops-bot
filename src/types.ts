import { Context } from "probot";
import { EventPayloads } from "@octokit/webhooks";

export type PRContext = Context<EventPayloads.WebhookPayloadPullRequest>;
