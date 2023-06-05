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
  isGPUTesterPR,
  isTrustedUser,
  updateOrCreateBranch,
} from "../../shared";
import { PRContext } from "../../types";

export class PRCopyPRs extends OpsBotPlugin {
  public context: PRContext;

  constructor(context: PRContext) {
    super("copy_prs", context);
    this.context = context;
  }

  async maybeCopyPR(): Promise<any> {
    const { payload } = this.context;
    const orgName = payload.repository.owner.login;
    const repoName = payload.repository.name;
    if (await this.pluginIsDisabled()) return;

    if (isGPUTesterPR(payload.pull_request)) {
      return;
    }

    // pull_request.opened event
    if (payload.action === "opened") {
      if (
        await isTrustedUser(
          this.context.octokit,
          payload.pull_request.user.login,
          orgName,
          repoName
        )
      ) {
        await this.context.octokit.rest.git.createRef({
          ref: `refs/heads/${getPRBranchName(payload.pull_request.number)}`,
          repo: payload.repository.name,
          owner: orgName,
          sha: payload.pull_request.head.sha,
        });
        return;
      }

      await this.context.octokit.issues.createComment({
        owner: orgName,
        repo: payload.repository.name,
        issue_number: payload.pull_request.number,
        body: `Pull requests from external contributors require approval from a \`${orgName}\` organization member with \`write\` permissions or greater before CI can begin.`,
      });
      return;
    }

    // pull_request.synchronize
    if (payload.action === "synchronize" || payload.action === "reopened") {
      if (
        await isTrustedUser(
          this.context.octokit,
          payload.pull_request.user.login,
          orgName,
          repoName
        )
      ) {
        await updateOrCreateBranch(
          this.context.octokit,
          getPRBranchName(payload.pull_request.number),
          payload.repository.name,
          orgName,
          payload.pull_request.head.sha
        );
      }
      return;
    }

    // pull_request.closed
    if (payload.action === "closed") {
      const branchName = getPRBranchName(payload.pull_request.number);
      try {
        await this.context.octokit.rest.git.deleteRef({
          ref: `heads/${branchName}`,
          repo: payload.repository.name,
          owner: orgName,
        });
      } catch {
        // do nothing
      }
      return;
    }
  }
}
