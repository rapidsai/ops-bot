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

import {
  AutoMergerContext,
  CommitStatus,
  IssueCommentContext,
  IssuesCommentsResponseData,
  PRContext,
  ProbotOctokit,
  PullRequestLike,
} from "./types.ts";

export const Permission = {
  admin: "admin",
  write: "write",
  maintain: "maintain",
};

export const Command = {
  OkToTest: new RegExp("^/ok(ay)? to test$"),
  Merge: new RegExp("^/merge$"),
  OldMerge: new RegExp("^@gpucibot merge$"),
};

/**
 * RegEx representing RAPIDS branch name patterns
 * (i.e. "branch-21.06", "branch-22.08", etc.)
 */
export const versionedBranchExp = /^branch-\d\d\.\d\d$/;

/**
 * Returns true if the provided string is a versioned branch
 * (i.e. "branch-21.06", "branch-22.08", etc.)
 * @param branchName
 */
export const isVersionedBranch = (branchName: string): boolean => {
  return Boolean(branchName.match(versionedBranchExp));
};

/**
 * Returns true if the provided string is a versioned branch that follows the ucxx/py versioning scheme
 * (i.e. "branch-0.36", "branch-0.40", etc.)
 * @param branchName
 */
export const isVersionedUCXBranch = (branchName: string): boolean => {
  const regex = /^branch-\d{1,2}\.\d\d$/;
  return Boolean(branchName.match(regex));
};

/**
 * Returns the RAPIDS version from a versioned branch name
 */
export const getVersionFromBranch = (branchName: string): string => {
  return branchName.split("-")[1];
};

/**
 * Returns an async function that will set a status on a given
 * commit. The returned function accepts a description, a state,
 * and an optional target URL.
 */
export const createSetCommitStatus = (
  octokit: ProbotOctokit,
  { context, owner, repo, sha, target_url = "" }: CommitStatus
) => {
  type StateStrings = "success" | "failure" | "error" | "pending";

  const initialTargetUrl = target_url;
  return async (
    description: string,
    state: StateStrings,
    target_url = initialTargetUrl
  ) => {
    await octokit.repos.createCommitStatus({
      context,
      owner,
      repo,
      sha,
      state,
      description,
      target_url,
      request: {
        retries: 3,
        retryAfter: 10,
      },
    });
  };
};

export const isGPUTesterPR = (
  pullRequest: PullRequestLike
): boolean => {
  return pullRequest.user?.login.toLowerCase() === "gputester";
};

export const isRapidsBotPR = (
  pullRequest: PullRequestLike
): boolean => {
  return pullRequest.user?.login.toLowerCase() === "rapids-bot[bot]";
};

/**
 * Returns true if the payload associated with the provided context
 * is from a GitHub Pull Request (as opposed to a GitHub Issue).
 * @param context
 */
export const issueIsPR = (context: IssueCommentContext): boolean => {
  return "pull_request" in context.payload.issue;
};

/**
 * Returns true if the given comment is the merge comment string.
 * @param comment
 */
export const isMergeComment = (comment: string): boolean => {
  return Boolean(comment.trim().match(Command.Merge));
};

/**
 * Returns true if the given comment is the old merge comment string.
 * @param comment
 */
export const isOldMergeComment = (comment: string): boolean => {
  return Boolean(comment.trim().match(Command.OldMerge));
};

/**
 * Retrieves the issue/PR comments that fit provided criteria
 * @param context
 * @param prNumber
 * @param requiredPermissions
 * @param predicate
 */
export async function validCommentsExistByPredicate(
  context: AutoMergerContext | PRContext,
  prNumber: number,
  requiredPermissions: string[],
  predicate: (comment: IssuesCommentsResponseData[0]) => Boolean
) {
  const repo = context.payload.repository;

  const allComments = await context.octokit.paginate(
    context.octokit.issues.listComments,
    {
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: prNumber,
    }
  );

  var filteredComments: IssuesCommentsResponseData = [];
  for (let i = 0; i < allComments.length; i++) {
    if (predicate(allComments[i])) {
      filteredComments.push(allComments[i]);
    }
  }

  const commentAuthors = filteredComments
    .map((comment) => comment.user?.login)
    .filter(Boolean);

  const authorPermissions = await Promise.all(
    commentAuthors.map(async (actor) => {
      return (
        await context.octokit.repos.getCollaboratorPermissionLevel({
          owner: repo.owner.login,
          repo: repo.name,
          username: actor as string,
        })
      ).data.permission;
    })
  );

  return authorPermissions.some((permission) =>
    requiredPermissions.includes(permission)
  );
}
