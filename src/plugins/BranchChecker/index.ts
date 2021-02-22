import { Application } from "probot";
import { PRBranchChecker } from "./pull_request";
import { RepositoryBranchChecker } from "./repository";

export const initBranchChecker = (app: Application) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.edited",
      "pull_request.synchronize",
    ],
    async (context) => {
      await new PRBranchChecker(context).checkPR();
    }
  );
  app.on("repository.edited", async (context) => {
    await new RepositoryBranchChecker(context).checkAllPRs();
  });
};
