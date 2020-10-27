import { Application } from "probot";
import { initLabelCheck } from "./plugins/LabelCheck/label_check";

export = (app: Application) => {
  initLabelCheck(app);
};
