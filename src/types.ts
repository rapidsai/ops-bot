/*
* Copyright (c) 2022, NVIDIA CORPORATION.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import { Context } from "probot";
import { Repository } from "@octokit/webhooks-types";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import {
  EmitterWebhookEvent,
  EmitterWebhookEventName,
} from "@octokit/webhooks";

type ContextFactory<E extends EmitterWebhookEventName> =
  EmitterWebhookEvent<E> & Omit<Context, keyof EmitterWebhookEvent>;

export type PRContext = ContextFactory<"pull_request">;
export type PushContext = ContextFactory<"push">;
export type IssueCommentContext = ContextFactory<"issue_comment">;
export type PRReviewContext = ContextFactory<"pull_request_review">;
export type StatusContext = ContextFactory<"status">;
export type RepositoryContext = ContextFactory<"repository">;
export type AutoMergerContext = ContextFactory<
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
export type IssuesCommentsResponseData = RestEndpointMethodTypes["issues"]["listComments"]["response"]["data"]
export type PayloadRepository = Repository;
export type ProbotOctokit = Context["octokit"];

export type CommitStatus = {
  context: string;
  owner: string;
  repo: string;
  sha: string;
  target_url?: string;
};
