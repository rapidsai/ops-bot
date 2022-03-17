import { Probot } from "probot";
import { initAutoMerger } from "./plugins/AutoMerger";
import { initBranchChecker } from "./plugins/BranchChecker";
import { initLabelChecker } from "./plugins/LabelChecker";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter";

export = (app: Probot) => {
  initBranchChecker(app);
  initLabelChecker(app);
  initReleaseDrafter(app);
  initAutoMerger(app);
};
