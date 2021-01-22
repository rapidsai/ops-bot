import { EventPayloads } from "@octokit/webhooks";
import axios from "axios";

export class JenkinsPermissions {
  async hasPermissionToTrigger(
    username: string,
    repo: EventPayloads.PayloadRepository
  ): Promise<boolean> {
    const prbConfigUrl = `https://gpuci.gpuopenanalytics.com/job/rapidsai/job/gpuci/job/${repo.name}/job/prb/job/${repo.name}-prb/config.xml`;
    const { data: response } = await axios.get(prbConfigUrl, {
      auth: {
        username: "gputester",
        password: process.env.JENKINS_API_TOKEN as string,
      },
    });

    return false;
  }
}
