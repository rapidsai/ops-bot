import {
  IssueCommentContext,
  PullsGetResponseData,
} from "../../types";
import {
  isPR,
  createCommitMessage,
  sanitizePrTitle,
} from "../../shared";

const GITHUB_ORG = "rapidsai";
const FORCE_MERGE_COMMENT = "@gpucibot force merge";
const FORCE_MERGE_ALLOWED_TEAM = "ops";

export class ForceMerger {
  public context: IssueCommentContext;
  constructor(context: IssueCommentContext) {
    this.context = context;
  }

  async maybeMergePR(): Promise<any> {
    const context = this.context;
    const { repository: repo } = context.payload;

    const comment = context.payload.comment.body;
    const commentAuthor = context.payload.comment.user.login;
    const prNumber = context.payload.issue.number;

    if (!isPR(context)) {
      console.warn(
        `The following comment from ${repo.full_name} #${prNumber} was from an issue, not a PR: ${comment}.\n`,
        `Skipping...`
      );
      return;
    }
    if (!this.isForceMergeComment(comment)) {
      console.warn(
        `The following comment from ${repo.full_name} #${prNumber} was not a merge comment: ${comment}.\n`,
        `Skipping...`
      );
      return;
    }
    if (!(await this.isAuthorAllowedToForceMerge(commentAuthor))) {
      console.warn(
        `The comment author is not allowed to force merge: ${commentAuthor}.\n`,
        `Skipping...`
      );
      return;
    }

    // Get PR info
    const { data: pr } = await context.octokit.pulls.get({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: prNumber,
    });

    const prDescription = `${repo.full_name} #${pr.number} - "${pr.title}"`;

    // Check if PR is mergeable (all green)
    if (!this.isPrForceMergeable(pr)) {
      console.warn(
        `${prDescription} is merging to "main" branch. Skipping...`
      );
      return;
    }

    // Generate commit message
    const commitMsg = await createCommitMessage(pr, this.context);

    // Merge PR
    console.log(`Force merging ${prDescription}`);
    const commitTitle = sanitizePrTitle(pr.title) + ` (#${pr.number})`;
    await context.octokit.pulls.merge({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: pr.number,
      merge_method: "squash",
      commit_title: commitTitle,
      commit_message: commitMsg,
    });
  }

  /**
   * Returns true if the given comment is the merge comment string.
   * (Case-insensitive, trims leading & trailing whitespace)
   * @param comment
   */
  isForceMergeComment(comment: string): boolean {
    return comment.toLowerCase().trim() === FORCE_MERGE_COMMENT;
  }

  /**
   * Returns true if PR is being merged into the default branch.
   * Unlike AutoMerger, this doesn't care about PR checks or CI status by design
   *
   * @param pr
   */
  isPrForceMergeable(pr: PullsGetResponseData): boolean {
    const repo = pr.base.repo.name;
    const number = pr.number;
    const baseRef = pr.base.ref;
    console.log(`${repo} ${number} force merge stats:`); // i.e. "cudf 3075 force merge stats"
    console.log(
      JSON.stringify({
        baseRef,
      })
    );
    return (
      baseRef !== "main"
    );
  }

  /**
   * Returns true if the comment author is a member of the 'ops' team of the rapidsai org
   *
   * @param commentAuthor
   */
  async isAuthorAllowedToForceMerge(commentAuthor: string): Promise<boolean> {
    const context = this.context;
    try {
      await context.octokit.teams.getMembershipForUserInOrg({
        org: GITHUB_ORG,
        team_slug: FORCE_MERGE_ALLOWED_TEAM,
        username: commentAuthor,
      });
      return true;
    } catch(e) {
      return false;
    }
  }
}