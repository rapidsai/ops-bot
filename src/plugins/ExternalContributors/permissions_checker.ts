import axios from "axios";
import { ProbotOctokit } from "probot";
import xm2js from "xml2js";

export class PermissionsChecker {
    constructor(private octokit: InstanceType<typeof ProbotOctokit>) {

    }

  /**
   * Checks whether the user who made the comment has permission to trigger jobs
   * @param username the name of the commenter
   * @param repoName the name of the repository
   * @param repoOwner the owner of the repository
   */
  async hasPermissionToTrigger(username: any, repoName: string, repoOwner: string): Promise<boolean> {
    
    //Get the config.xml for the repo's PRB job - this has the GitHub PRB configuration
    const prbConfigUrl = `https://gpuci.gpuopenanalytics.com/job/${repoOwner}/job/gpuci/job/${repoName}/job/prb/job/${repoName}-prb/config.xml`;
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
      const { status } = await this.octokit.orgs.checkMembershipForUser({
        org: org,
        username: username,
      });
      // @ts-ignore // typescript thinks "status" is always 302
      if (status === 204) {
        return true;
      }
    }
    return false;
  }
}