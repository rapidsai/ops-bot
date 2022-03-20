import axios from "axios";
import { readFileSync } from "fs";
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
    // let { data: response } = await axios.get(prbConfigUrl, {
    //   auth: {
    //     username: "jawe-api-token",//"gputester",
    //     password: "11c5f460a7ab55e2b8912e3bf289701859" //process.env.JENKINS_API_TOKEN as string,
    //   },
    // });
    
    let response = readFileSync("./test/fixtures/responses/jenkins_config.xml"); // temporary workaround for testing

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

    console.log('failed to validate permission')
    return false;
  }
}