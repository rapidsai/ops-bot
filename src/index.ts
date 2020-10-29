import { Application } from "probot";
import { initLabelCheck } from "./plugins/LabelCheck/label_check";
import releaseDrafter from "release-drafter-github-app";

export = (app: Application) => {
  initLabelCheck(app);
  releaseDrafter(app);
};
