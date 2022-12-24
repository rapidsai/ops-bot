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

import { OpsBotPlugin } from "../../plugin";
import {
  getPRBranchName,
  isOkayToTestComment,
  isOrgMember,
  issueIsPR,
  Permission,
  updateOrCreateBranch,
} from "../../shared";
import { IssueCommentContext } from "../../types";

export class CommentCopyPRs extends OpsBotPlugin {
  public context: IssueCommentContext;

  constructor(context: IssueCommentContext) {
    super("copy_prs", context);
    this.context = context;
  }

  async maybeCopyPR(): Promise<any> {
    if (await this.pluginIsDisabled()) return;
    const context = this.context;
    const { payload } = context;

    if (!isOkayToTestComment(payload.comment.body)) {
      return;
    }

    if (!issueIsPR(this.context)) {
      context.log.info(context.payload, "comment was for issue, not PR");
      return;
    }

    // branches for org members are created automaticallyin ./pr.ts,
    // so return here
    if (
      await isOrgMember(
        this.context.octokit,
        payload.issue.user.login,
        payload.repository.owner.login
      )
    ) {
      return;
    }

    if (!(await this.authorHasPermission(payload.comment.user.login))) {
      context.log.info(context.payload, "invalid ok to test permission");
      return;
    }

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
