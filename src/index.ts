import { Probot } from "probot";
import { initAutoMerger } from "./plugins/AutoMerger";
import { initBranchChecker } from "./plugins/BranchChecker";
import { initJobComponentTrigger } from "./plugins/JobComponentTrigger";
import { initLabelChecker } from "./plugins/LabelChecker";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter";

export = (app: Probot) => {
  app.on("pull_request", (context) => {
    context.octokit.issues.listComments();
  });
  initBranchChecker(app);
  initLabelChecker(app);
  initReleaseDrafter(app);
  initAutoMerger(app);
  initJobComponentTrigger(app);
};
