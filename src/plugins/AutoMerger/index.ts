import { Application } from "probot";
import { AutoMergerContext } from "../../types";
import { AutoMerger } from "./auto_merger";

export const initAutoMerger = (app: Application) => {
  app.on(
    ["issue_comment.created", "pull_request_review.submitted", "status"],
    async (context: AutoMergerContext) => {
      await new AutoMerger(context).maybeMergePR();
    }
  );
};
