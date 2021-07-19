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
      target_url: "https://docs.rapids.ai/resources/label-checker/",
    });

    await setCommitStatus("Checking labels...", "pending");

    // An arbitrary delay to ensure that "pull_request.labeled" events are processed after
    // "pull_request.opened" events. This is required to prevent race conditions from occurring
    // when opening PRs programmatically with the "gh" or "r3" CLI tools.
    if (
      context.payload.action === "labeled" &&
      process.env.NODE_ENV !== "test"
    ) {
      await new Promise((res) => setTimeout(res, 2000));
    }

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
