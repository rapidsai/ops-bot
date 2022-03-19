import { EmitterWebhookEvent } from "@octokit/webhooks";
import { exitIfFeatureIsDisabled } from "../../shared";
import { AutoMergerContext, PRContext, PRReviewContext } from "../../types";
import { PermissionsChecker } from "./permissions_checker";

export class PRExternalContributors {
    constructor(private context: PRContext, private permissionsChecker: PermissionsChecker) {
        
    }

    async pipePR(): Promise<any> {
        const { payload } = this.context
        await exitIfFeatureIsDisabled(this.context, "external_contributors");

        // pull_request.opened event
        if(payload.action == "opened") {
            // make sure author is external contributor
            if(await this.authorIsNotExternalContributor(payload.sender.name, payload.organization?.id)) return
            await this.context.octokit.issues.createComment({ //might be the pulls object instead; test
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                issue_number: payload.pull_request.id,
                body: "Pull requests from external contributors require approval from a RAPIDS organization member before CI can begin."
            })
        }

        // pull_request.synchronize
        if(payload.action == "synchronize") {
            // get the existing okay to test comment; then
            // ensure that the comment is valid in that: comment-er has CI run permission
            const comment = await this.getExistingOkayToTestComment()       
            if(!comment || !await this.permissionsChecker.hasPermissionToTrigger(
                    comment.user?.login, 
                    payload.repository.name, 
                    payload.repository.owner.login
                )
            ) return

            // Update commit on the source repository branch to match forked branch
            return await this.context.octokit.rest.git.updateRef({
                ref: `refs/heads/external-pr-${payload.pull_request.number}`,
                repo: payload.repository.name,
                owner: payload.repository.owner.login,
                sha: payload.pull_request.base.sha
            })

        }

        // pull_request.closed
        if(payload.action == "closed") {
            // Delete the source repository branch if exists
            const branchName = `external-pr-${payload.pull_request.number}`
            const branch = await this.context.octokit.rest.git.getRef({
                ref: `refs/heads/${branchName}`,
                repo: payload.repository.name,
                owner: payload.repository.owner.login,
            })
            if(!!branch) {
                this.context.octokit.rest.git.deleteRef({
                    ref: `refs/heads/${branchName}`,
                    repo: payload.repository.name,
                    owner: payload.repository.owner.login,
                })
            }
        }

        return Promise.resolve(true)
    }


    async authorIsNotExternalContributor(author: any, org: any) {
        return this.context.octokit.orgs.getMembershipForUser({username: author, org})
        .then(_ => true)
        .catch(_ => false)
    }

    async getExistingOkayToTestComment() {
        const payload = this.context.payload
        const comments = await this.context.octokit.paginate(this.context.octokit.issues.listComments, {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: payload.pull_request.number,
            per_page: 100,
        });
        for (const comment of comments) {
            if (comment.body === "ok to test") return comment;
        }
        return null
    }
}

