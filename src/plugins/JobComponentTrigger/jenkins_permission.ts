import axios from "axios";
import xm2js from "xml2js";
import { IssueCommentContext } from "../../types";

export class JenkinsPermissions {
  /**
   * Checks whether the user who made the comment has permission to trigger jobs
   * @param context the IssueCommentContext to validate permission for
   */
  async hasPermissionToTrigger(context: IssueCommentContext): Promise<boolean> {
    const username = context.payload.comment.user.login;
    const repo = context.payload.repository;

    //Get the config.xml for the repo's PRB job - this has the GitHub PRB configuration
    const prbConfigUrl = `https://gpuci.gpuopenanalytics.com/job/${repo.owner.login}/job/gpuci/job/${repo.name}/job/prb/job/${repo.name}-prb/config.xml`;
    const { data: response } = await axios.get(prbConfigUrl, {
      auth: {
        username: "gputester",
        password: process.env.JENKINS_API_TOKEN as string,
      },
    });
    const xmlParser = new xm2js.Parser({ explicitArray: false });
    const root = await xmlParser.parseStringPromise(response);
    //Icky XML/JSON mashup parsing...
    const ghprb =
      root["flow-definition"].properties[
        "org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty"
      ].triggers["org.jenkinsci.plugins.ghprb.GhprbTrigger"];

    //Check if user is an admin
    const admins = ghprb.adminlist.split(/\s+/);
    if (admins.includes(username)) {
      return true;
    }

    //Check if user is whitelisted
    const whitelist = ghprb.whitelist.split(/\s+/);
    if (whitelist.includes(username)) {
      return true;
    }

    //Check if user is a whitelisted organization
    const orgs = ghprb.orgslist.split(/\s+/);
    for (const org of orgs) {
      const { status } = await context.octokit.orgs.checkMembershipForUser({
        org: org,
        username: username,
      });
      if (status == 204) {
        return true;
      }
    }

    //Finally check if an admin has commented `ok to test` on the PR
    const comments = await context.octokit.paginate(context.octokit.issues.listComments, {
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: context.payload.issue.number,
      per_page: 100,
    });
    for (const comment of comments) {
      if (
        comment.body === "ok to test" &&
        admins.includes(comment.user.login)
      ) {
        return true;
      }
    }

    return false;
  }
}
