import { Application } from "probot";
import { PRContext } from "../../types";

export const initLabelCheck = (app: Application) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.labeled",
      "pull_request.unlabeled",
      "pull_request.synchronize",
    ],
    checkLabels
  );
};

const checkLabels = async (context: PRContext) => {
  await setLabelCheckStatus(context, "Checking labels...");

  const validLabels = [
    "bug",
    "doc",
    "breaking change",
    "feature request",
    "improvement",
  ];

  const labelsOnPR = context.payload.pull_request.labels;

  const validLabelsOnPR: string[] = [];

  for (let i = 0; i < labelsOnPR.length; i++) {
    const label = labelsOnPR[i];

    if (validLabels.includes(label.name)) {
      validLabelsOnPR.push(label.name);
    }
  }

  if (validLabelsOnPR.length === 0) {
    return await setLabelCheckStatus(context, "No labels applied", "failure");
  }

  if (validLabelsOnPR.length > 1) {
    return await setLabelCheckStatus(
      context,
      "Too many labels applied",
      "failure"
    );
  }

  return await setLabelCheckStatus(
    context,
    "Correct labels applied",
    "success"
  );
};

type StatusStrings = "success" | "failure" | "error" | "pending";

const setLabelCheckStatus = async (
  context: PRContext,
  description: string,
  state: StatusStrings = "pending"
) => {
  const statusOptions = {
    context: "Label Checker",
    state,
    description,
    sha: context.payload.pull_request.head.sha,
  };

  return await context.github.repos.createCommitStatus(
    context.repo(statusOptions)
  );
};
