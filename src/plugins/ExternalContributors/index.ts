import { Probot } from "probot";
import { PRExternalContributors } from "./pr_ex_contibutors";
import { PRReviewExternalContributors } from "./pr_review_ex_contributors";

export const initExternalContributors = (app: Probot) => {
    app.on(
      [
        "pull_request.opened",
        "pull_request.synchronize",
        "pull_request.closed",
        "pull_request.reopened"
      ],
      async (context) => {
      await new PRExternalContributors(
        context
      ).pipePR();
    });

    app.on(["issue_comment.created"],
      async (context) => {
      await new PRReviewExternalContributors(
        context
      ).pipePR();
    });
  };
  