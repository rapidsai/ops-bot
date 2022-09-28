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
  featureIsDisabled,
  getPRBranchName,
  isOkayToTestComment,
  isOrgMember,
  issueIsPR,
  Permission,
  updateOrCreateBranch,
} from "../../shared";
import { IssueCommentContext } from "../../types";

export class CommentCopyPRs {
  constructor(private context: IssueCommentContext) {}

  async maybeCopyPR(): Promise<any> {
    if (await featureIsDisabled(this.context, "copy_prs")) return;
    const { payload } = this.context;
    const prNumber = payload.issue.number;
    const username = payload.comment.user.login;

    if (!isOkayToTestComment(payload.comment.body)) {
      return;
    }

    //Only run on PRs
    if (!issueIsPR(this.context)) {
      console.warn(
        `Comment on ${payload.repository.full_name} #${prNumber} was not on a PR. Skipping...`
      );
      return;
    }

    if (
      await isOrgMember(
        this.context.octokit,
        payload.issue.user.login,
        payload.repository.owner.login
      )
    ) {
      return;
    }

    //check if comment-er has CI run permission
    if (!(await this.authorHasPermission(username))) {
      console.warn(
        `Comment on ${payload.repository.full_name} #${prNumber} by ${username} does not have trigger permissions. Skipping...`
      );
      return;
    }

    // copy code from forked repository to source repository.
    // first get the PR
    const pr = await this.context.octokit.pulls.get({
      repo: payload.repository.name,
      owner: payload.repository.owner.login,
      pull_number: payload.issue.number,
    });

    await updateOrCreateBranch(
      this.context.octokit,
      getPRBranchName(payload.issue.number),
      payload.repository.name,
      payload.repository.owner.login,
      pr.data.head.sha
    );
  }

  private async authorHasPermission(actor) {
    return [Permission.admin, Permission.write].includes(
      (
        await this.context.octokit.repos.getCollaboratorPermissionLevel({
          owner: this.context.payload.repository.owner.login,
          repo: this.context.payload.repository.name,
          username: actor,
        })
      ).data.permission
    );
  }
}
