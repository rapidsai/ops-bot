import { createSetCommitStatus, isReleasePR } from "../../shared";
import { PRContext } from "../../types";

export class LabelChecker {
  public context: PRContext;

  constructor(context: PRContext) {
    this.context = context;
  }

  async checkLabels(): Promise<any> {
    const context = this.context;

    const setCommitStatus = createSetCommitStatus(context.octokit, {
      context: "Label Checker",
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      sha: context.payload.pull_request.head.sha,
    });

    await setCommitStatus("Checking labels...", "pending");

    if (this.isForwardMergePR()) {
      return await setCommitStatus(
        "No labels necessary for forward-merging PRs",
        "success"
      );
    }

    if (isReleasePR(context.payload.pull_request)) {
      return await setCommitStatus(
        "No labels necessary for release PRs",
        "success"
      );
    }

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
      return await setCommitStatus(
        "Missing category & breaking labels",
        "failure"
      );
    }

    if (!breakingLabelCount && categoryLabelCount === 1) {
      return await setCommitStatus("Missing breaking label", "failure");
    }

    if (!categoryLabelCount && breakingLabelCount === 1) {
      return await setCommitStatus("Missing category label", "failure");
    }

    if (categoryLabelCount === 1 && breakingLabelCount > 1) {
      return await setCommitStatus(
        "Too many breaking labels applied",
        "failure"
      );
    }

    if (breakingLabelCount === 1 && categoryLabelCount > 1) {
      return await setCommitStatus(
        "Too many category labels applied",
        "failure"
      );
    }

    if (!breakingLabelCount && categoryLabelCount > 1) {
      return await setCommitStatus(
        "Missing breaking label & too many category labels applied",
        "failure"
      );
    }

    if (!categoryLabelCount && breakingLabelCount > 1) {
      return await setCommitStatus(
        "Missing category label & too many breaking labels applied",
        "failure"
      );
    }

    if (categoryLabelCount > 1 && breakingLabelCount > 1) {
      return await setCommitStatus(
        "Too many category & breaking labels applied",
        "failure"
      );
    }

    return await setCommitStatus("Correct labels applied", "success");
  }

  private isForwardMergePR(): boolean {
    const { context } = this;
    return (
      context.payload.pull_request.user.login === "GPUtester" &&
      context.payload.pull_request.title
        .toLowerCase()
        .includes("[gpuci] forward-merge")
    );
  }
}
