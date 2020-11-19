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

  const categoryLabels = ["bug", "doc", "feature request", "improvement"];
  const breakingLabels = ["breaking", "non-breaking"];
  const labelsOnPR = context.payload.pull_request.labels;

  let categoryLabelCount = 0;
  let breakingLabelCount = 0;

  for (let i = 0; i < labelsOnPR.length; i++) {
    const label = labelsOnPR[i];

    if (categoryLabels.includes(label.name)) {
      categoryLabelCount++;
    }

    if (breakingLabels.includes(label.name)) {
      breakingLabelCount++;
    }
  }

  if (!categoryLabelCount && !breakingLabelCount) {
    return await setLabelCheckStatus(
      context,
      "Missing category & breaking labels",
      "failure"
    );
  }

  if (!breakingLabelCount && categoryLabelCount === 1) {
    return await setLabelCheckStatus(
      context,
      "Missing breaking label",
      "failure"
    );
  }

  if (!categoryLabelCount && breakingLabelCount === 1) {
    return await setLabelCheckStatus(
      context,
      "Missing category label",
      "failure"
    );
  }

  if (categoryLabelCount === 1 && breakingLabelCount > 1) {
    return await setLabelCheckStatus(
      context,
      "Too many breaking labels applied",
      "failure"
    );
  }

  if (breakingLabelCount === 1 && categoryLabelCount > 1) {
    return await setLabelCheckStatus(
      context,
      "Too many category labels applied",
      "failure"
    );
  }

  if (!breakingLabelCount && categoryLabelCount > 1) {
    return await setLabelCheckStatus(
      context,
      "Missing breaking label & too many category labels applied",
      "failure"
    );
  }

  if (!categoryLabelCount && breakingLabelCount > 1) {
    return await setLabelCheckStatus(
      context,
      "Missing category label & too many breaking labels applied",
      "failure"
    );
  }

  if (categoryLabelCount > 1 && breakingLabelCount > 1) {
    return await setLabelCheckStatus(
      context,
      "Too many category & breaking labels applied",
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
