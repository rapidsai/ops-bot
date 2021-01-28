import axios from "axios";
import xm2js from "xml2js";
import { IssueCommentContext } from "../../types";

export class JenkinsPermissions {
  async hasPermissionToTrigger(context: IssueCommentContext): Promise<boolean> {
    const username = context.payload.comment.user.login;
    const repo = context.payload.repository;

    const prbConfigUrl = `https://gpuci.gpuopenanalytics.com/job/${repo.owner.login}/job/gpuci/job/${repo.name}/job/prb/job/${repo.name}-prb/config.xml`;
    const { data: response } = await axios.get(prbConfigUrl, {
      auth: {
        username: "gputester",
        password: process.env.JENKINS_API_TOKEN as string,
      },
    });
    const xmlParser = new xm2js.Parser({ explicitArray: false });
    const root = await xmlParser.parseStringPromise(response);
    const ghprb =
      root["flow-definition"].properties[
        "org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty"
      ].triggers["org.jenkinsci.plugins.ghprb.GhprbTrigger"];

    const admins = ghprb.adminlist.split(/\s+/);
    if (admins.includes(username)) {
      return true;
    }

    const whitelist = ghprb.whitelist.split(/\s+/);
    if (whitelist.includes(username)) {
      return true;
    }

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
