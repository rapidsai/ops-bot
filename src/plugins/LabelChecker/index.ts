import { Probot } from "probot";
import { LabelChecker } from "./label_checker";

export const initLabelChecker = (app: Probot) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    async (context) => {
      await new LabelChecker(context).checkLabels();
    }
  );
};
