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

import { ADMIN_PERMISSION, featureIsDisabled, getExternalPRBranchName, isOkayToTestComment, issueIsPR, WRITE_PERMISSION } from "../../shared";
import { IssueCommentContext } from "../../types";

export class PRReviewExternalContributors {
    constructor(private context: IssueCommentContext) {
        
    }

    async pipePR(): Promise<any> {
        if (await featureIsDisabled(this.context, "external_contributors")) return;
        const { payload } = this.context
        const prNumber = payload.issue.number
        const username = payload.comment.user.login

        if(!isOkayToTestComment(payload.comment.body)) return

        //Only run on PRs
        if (!issueIsPR(this.context)) {
          console.warn(
            `Comment on ${payload.repository.full_name} #${prNumber} was not on a PR. Skipping...`
          );
          return false;
        }

        //check if comment-er has CI run permission
        if (!await this.authorHasPermission(
            username
        )) {
            console.warn(
                `Comment on ${payload.repository.full_name} #${prNumber} by ${username} does not have trigger permissions. Skipping...`
            );
            return false;
        }
        
        // copy code from forked repository to source repository.
        // first get the PR
        const pr = await this.context.octokit.pulls.get({
            repo: payload.repository.name,
            owner: payload.repository.owner.login,
            pull_number: payload.issue.number
        })

        return await this.context.octokit.rest.git.createRef({
            ref: `refs/heads/${getExternalPRBranchName(payload.issue.number)}`,
            repo: payload.repository.name,
            owner: payload.repository.owner.login,
            sha: pr.data.head.sha
        })
    }

    private async authorHasPermission(actor) {
        return [ADMIN_PERMISSION, WRITE_PERMISSION].includes((
            await this.context.octokit.repos.getCollaboratorPermissionLevel({
              owner: this.context.payload.repository.owner.login,
              repo: this.context.payload.repository.name,
              username: actor,
            })
          ).data.permission);
    }
}

