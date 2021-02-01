import { Application } from "probot";
import { AutoMerger } from "./plugins/AutoMerger/auto_merger";
import { LabelChecker } from "./plugins/LabelChecker/label_checker";
import { ReleaseDrafter } from "./plugins/ReleaseDrafter/release_drafter";
import { JobComponentTrigger } from "./plugins/JobComponentTrigger/job_component_trigger";
import { JenkinsPermissions } from "./plugins/JobComponentTrigger/jenkins_permission";
import {
  AutoMergerContext,
  IssueCommentContext,
  PRContext,
  PushContext,
} from "./types";

export = ({ app }: { app: Application }) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    checkLabels
  );
  app.on(["push"], draftRelease);
  app.on(
    ["issue_comment.created", "pull_request_review.submitted", "status"],
    automerge
  );
  app.on(["issue_comment.created"], jobTrigger);
};

const checkLabels = async (context: PRContext): Promise<any> => {
  await new LabelChecker(context).checkLabels();
};

const draftRelease = async (context: PushContext): Promise<any> => {
  await new ReleaseDrafter(context).draftRelease();
};

const automerge = async (context: AutoMergerContext): Promise<any> => {
  await new AutoMerger(context).maybeMergePR();
};

const jobTrigger = async (context: IssueCommentContext): Promise<any> => {
  await new JobComponentTrigger(
    context,
    new JenkinsPermissions()
  ).maybeTriggerJobs();
};
