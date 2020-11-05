import { Application } from "probot";
import { initLabelCheck } from "./plugins/LabelCheck/label_check";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter/release_drafter";

export = (app: Application) => {
  initLabelCheck(app);
  initReleaseDrafter(app);
};
