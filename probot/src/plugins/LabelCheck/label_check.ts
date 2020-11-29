import { PRContext } from "../../types";

type StatusStrings = "success" | "failure" | "error" | "pending";
export class LabelChecker {
  public context: PRContext;

  constructor(context: PRContext) {
    this.context = context;
  }

  async checkLabels(): Promise<any> {
    const context = this.context;
    await this.setLabelCheckStatus("Checking labels...");

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
      return await this.setLabelCheckStatus(
        "Missing category & breaking labels",
        "failure"
      );
    }

    if (!breakingLabelCount && categoryLabelCount === 1) {
      return await this.setLabelCheckStatus(
        "Missing breaking label",
        "failure"
      );
    }

    if (!categoryLabelCount && breakingLabelCount === 1) {
      return await this.setLabelCheckStatus(
        "Missing category label",
        "failure"
      );
    }

    if (categoryLabelCount === 1 && breakingLabelCount > 1) {
      return await this.setLabelCheckStatus(
        "Too many breaking labels applied",
        "failure"
      );
    }

    if (breakingLabelCount === 1 && categoryLabelCount > 1) {
      return await this.setLabelCheckStatus(
        "Too many category labels applied",
        "failure"
      );
    }

    if (!breakingLabelCount && categoryLabelCount > 1) {
      return await this.setLabelCheckStatus(
        "Missing breaking label & too many category labels applied",
        "failure"
      );
    }

    if (!categoryLabelCount && breakingLabelCount > 1) {
      return await this.setLabelCheckStatus(
        "Missing category label & too many breaking labels applied",
        "failure"
      );
    }

    if (categoryLabelCount > 1 && breakingLabelCount > 1) {
      return await this.setLabelCheckStatus(
        "Too many category & breaking labels applied",
        "failure"
      );
    }

    return await this.setLabelCheckStatus("Correct labels applied", "success");
  }

  private async setLabelCheckStatus(
    description: string,
    state: StatusStrings = "pending"
  ) {
    const context = this.context;
    const statusOptions = {
      context: "Label Checker",
      state,
      description,
      sha: context.payload.pull_request.head.sha,
    };
    const { repository } = context.payload;
    return await context.github.repos.createCommitStatus({
      owner: repository.owner.login,
      repo: repository.name,
      ...statusOptions,
    });
  }
}
