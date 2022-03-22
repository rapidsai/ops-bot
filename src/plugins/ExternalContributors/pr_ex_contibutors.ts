import { EmitterWebhookEvent } from "@octokit/webhooks";
import { exitIfFeatureIsDisabled } from "../../shared";
import { AutoMergerContext, PRContext, PRReviewContext } from "../../types";

export class PRExternalContributors {
    constructor(private context: PRContext) {
        
    }

    async pipePR(): Promise<any> {
        const { payload } = this.context
        await exitIfFeatureIsDisabled(this.context, "external_contributors");
        console.log(this.context.payload)
        // pull_request.opened event
        if(payload.action == "opened") {
            // make sure author is external contributor
            if(await this.authorIsNotExternalContributor(payload.sender.login, payload.organization?.login)) return
            return await this.context.octokit.issues.createComment({
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                issue_number: payload.pull_request.number,
                body: "Pull requests from external contributors require approval from a RAPIDS organization member before CI can begin."
            })
        }

        // pull_request.synchronize
        if(payload.action == "synchronize") {
            // check for valid comments
            if(!await this.validCommentsExist()) return

            // Update commit on the source repository branch to match forked branch
            return await this.context.octokit.rest.git.updateRef({
                ref: `heads/external-pr-${payload.pull_request.number}`,
                repo: payload.repository.name,
                owner: payload.repository.owner.login,
                sha: payload.pull_request.head.sha
            })

        }

        // pull_request.closed
        if(payload.action == "closed") {
            // Delete the source repository branch if exists
            const branchName = `external-pr-${payload.pull_request.number}`
            const branch = await this.context.octokit.rest.git.getRef({
                ref: `heads/${branchName}`,
                repo: payload.repository.name,
                owner: payload.repository.owner.login,
            })
            if(branch.status == 200) {
                return this.context.octokit.rest.git.deleteRef({
                    ref: `heads/${branchName}`,
                    repo: payload.repository.name,
                    owner: payload.repository.owner.login,
                })
            }
        }
    }


    private async authorIsNotExternalContributor(author: any, org: any) {
        return this.context.octokit.orgs.checkMembershipForUser({username: author, org})
        .then(data => data.status == (204 as any))
        .catch(_ => false)
    }

    private async validCommentsExist(): Promise<boolean> {
        const payload = this.context.payload
        const comments = await this.context.octokit.paginate(this.context.octokit.issues.listComments, {
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: payload.pull_request.number,
            per_page: 100,
        });
        const okCommentsAuthors = comments.filter(comment => {
            return !!comment.user && ["ok to test", "okay to test"].includes(comment.body as string)
        }).map(comment => comment.user?.login) as string[]

        const permissions = await Promise.all(
            okCommentsAuthors.map(async (actor) => {
              return (
                await this.context.octokit.repos.getCollaboratorPermissionLevel({
                  owner: payload.repository.owner.login,
                  repo: payload.repository.name,
                  username: actor,
                })
              ).data.permission;
            })
          );
      
        return permissions.includes("admin") || permissions.includes("write");
    }
}

