import { RepositoryContext } from "../../types";
import { checkPR } from "./check_pr";

export class RepositoryBranchChecker {
  context: RepositoryContext;

  constructor(context: RepositoryContext) {
    this.context = context;
  }

  async checkAllPRs() {
    const { context } = this;
    const repo = context.payload.repository;

    const prs = await context.octokit.paginate(context.octokit.pulls.list, {
      owner: repo.owner.login,
      repo: repo.name,
    });

    await Promise.all(
      prs.map(async (pr) => {
        await checkPR(context.octokit, pr);
      })
    );
  }
}
