import { Application } from "probot";
import { IssueCommentContext } from "../../types";
import { ForceMerger } from "./force_merger";

export const initForceMerger = (app: Application) => {
  app.on(
    ["issue_comment.created"],
    async (context: IssueCommentContext) => {
      await new ForceMerger(context).maybeMergePR();
    }
  );
};
