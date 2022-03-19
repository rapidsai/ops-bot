import { Probot } from "probot";
import { PermissionsChecker } from "./permissions_checker";
import { PRExternalContributors } from "./pull_request";
import { PRReviewExternalContributors } from "./pull_request_comment";

export const initJobComponentTrigger = (app: Probot) => {
    app.on(
      [
        "pull_request.opened",
        "pull_request.synchronize",
        "pull_request.closed"
      ],
      async (context) => {
      await new PRExternalContributors(
        context,
        new PermissionsChecker(context.octokit)
      ).pipePR();
    });

    app.on(["issue_comment.created"],
      async (context) => {
      await new PRReviewExternalContributors(
        context,
        new PermissionsChecker(context.octokit)
      ).pipePR();
    });
  };
  