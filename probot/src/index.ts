import { Application } from "probot";
import { LabelChecker } from "./plugins/LabelCheck/label_check";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter/release_drafter";
import { PRContext } from "./types";

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
  initReleaseDrafter(app);
};

const checkLabels = async (context: PRContext): Promise<any> => {
  await new LabelChecker(context).checkLabels();
};
