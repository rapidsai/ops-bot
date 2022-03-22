import { EmitterWebhookEvent } from "@octokit/webhooks";
import { featureIsDisabled, issueIsPR } from "../../shared";
import { AutoMergerContext, IssueCommentContext, PRContext, PRReviewContext } from "../../types";

export class PRReviewExternalContributors {
    constructor(private context: IssueCommentContext) {
        
    }

    async pipePR(): Promise<any> {
        if (await featureIsDisabled(this.context, "external_contributors")) return;
        const { payload } = this.context
        const prNumber = payload.issue.number
        const username = payload.comment.user.login

        if(!["ok to test", "okay to test"].includes(payload.comment.body)) return

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
            ref: `refs/heads/external-pr-${payload.issue.number}`,
            repo: payload.repository.name,
            owner: payload.repository.owner.login,
            sha: pr.data.head.sha
        })
    }

    private async authorHasPermission(actor) {
        return ["admin", "write"].includes((
            await this.context.octokit.repos.getCollaboratorPermissionLevel({
              owner: this.context.payload.repository.owner.login,
              repo: this.context.payload.repository.name,
              username: actor,
            })
          ).data.permission);
    }
}

