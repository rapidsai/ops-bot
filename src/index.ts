import { Application } from "probot";
import { initAutoMerger } from "./plugins/AutoMerger";
import { initForceMerger } from "./plugins/ForceMerger";
import { initBranchChecker } from "./plugins/BranchChecker";
import { initJobComponentTrigger } from "./plugins/JobComponentTrigger";
import { initLabelChecker } from "./plugins/LabelChecker";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter";

export = ({ app }: { app: Application }) => {
  initBranchChecker(app);
  initLabelChecker(app);
  initReleaseDrafter(app);
  initAutoMerger(app);
  initForceMerger(app);
  initJobComponentTrigger(app);
};
