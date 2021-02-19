import { Application } from "probot";
import { initAutoMerger } from "./plugins/AutoMerger";
import { initLabelChecker } from "./plugins/LabelChecker";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter";

export = ({ app }: { app: Application }) => {
  initLabelChecker(app);
  initReleaseDrafter(app);
  initAutoMerger(app);
};
