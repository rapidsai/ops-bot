import { Probot } from "probot";
import { JenkinsPermissions } from "./jenkins_permission";
import { JobComponentTrigger } from "./job_component_trigger";

export const initJobComponentTrigger = (app: Probot) => {
  app.on(["issue_comment.created"], async (context) => {
    await new JobComponentTrigger(
      context,
      new JenkinsPermissions()
    ).maybeTriggerJobs();
  });
};
