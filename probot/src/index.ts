import { Application } from "probot";
import { LabelChecker } from "./plugins/LabelChecker/label_checker";
import { ReleaseDrafter } from "./plugins/ReleaseDrafter/release_drafter";
import { PRContext, PushContext } from "./types";

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
};

const checkLabels = async (context: PRContext): Promise<any> => {
  await new LabelChecker(context).checkLabels();
};

const draftRelease = async (context: PushContext): Promise<any> => {
  await new ReleaseDrafter(context).draftRelease();
};
