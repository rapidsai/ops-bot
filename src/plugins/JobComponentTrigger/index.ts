import { Application } from "probot";
import { JenkinsPermissions } from "./jenkins_permission";
import { JobComponentTrigger } from "./job_component_trigger";

export const initJobComponentTrigger = (app: Application) => {
  app.on(["issue_comment.created"], async (context) => {
    await new JobComponentTrigger(
      context,
      new JenkinsPermissions()
    ).maybeTriggerJobs();
  });
};
