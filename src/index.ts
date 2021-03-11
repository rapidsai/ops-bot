import { Application } from "probot";
import { initAutoMerger } from "./plugins/AutoMerger";
import { initBranchChecker } from "./plugins/BranchChecker";
import { initLabelChecker } from "./plugins/LabelChecker";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter";

export = ({ app }: { app: Application }) => {
  initBranchChecker(app);
  initLabelChecker(app);
  initReleaseDrafter(app);
  initAutoMerger(app);
};