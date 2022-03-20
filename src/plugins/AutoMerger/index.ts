import { Probot } from "probot";
import { AutoMerger } from "./auto_merger";

export const initAutoMerger = (app: Probot) => {
  app.on(
    ["issue_comment.created", "pull_request_review.submitted", "status"],
    async (context) => {
      // await new AutoMerger(context).maybeMergePR();
    }
  );
};
