import { PRContext } from "../../types";
import { checkPR } from "./check_pr";

export class PRBranchChecker {
  context: PRContext;

  constructor(context: PRContext) {
    this.context = context;
  }

  async checkPR() {
    const { context } = this;
    await checkPR(context.octokit, context.payload.pull_request);
  }
}
