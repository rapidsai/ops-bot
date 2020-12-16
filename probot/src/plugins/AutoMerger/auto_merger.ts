import {
  AutoMergerContext,
  IssueCommentContext,
  PRReviewContext,
  PullsGetResponseData,
  StatusContext,
  UsersGetByUsernameResponseData,
} from "../../types";
import strip from "strip-comments";

const MERGE_COMMENT = "okay to merge";

export class AutoMerger {
  public context: AutoMergerContext;
  constructor(context: AutoMergerContext) {
    this.context = context;
  }

  async maybeMergePR(): Promise<any> {
    const context = this.context;
    const { repository: repo } = context.payload;
    let prNumber = -1;

    // Handle "status" context
    if (this.isStatusContext(context)) {
      const sha = context.payload.sha;
      if (context.payload.state !== "success") {
        console.warn(
          `Status is not "success" for sha:${sha} in repo:${repo.full_name}. Skipping...`
        );
        return;
      }
      prNumber = await this.getPRNumberfromSHA(context);
      if (prNumber === -1) {
        console.warn(
          `Could not find PR for sha:${sha} in repo:${repo.full_name}. Skipping...`
        );
        return;
      }
    }

    // Handle "issue_comment" context
    if (this.isIssueCommentContext(context)) {
      const comment = context.payload.comment.body;
      prNumber = context.payload.issue.number;
      if (!this.isPR(context)) {
        console.warn(
          `The following comment from ${repo.full_name} #${prNumber} was from an issue, not a PR: ${comment}.\n`,
          `Skipping...`
        );
        return;
      }
      if (!this.isMergeComment(comment)) {
        console.warn(
          `The following comment from ${repo.full_name} #${prNumber} was not a merge comment: ${comment}.\n`,
          `Skipping...`
        );
        return;
      }
    }

    // Handle "pull_request_review" context
    if (this.isPRReviewContext(context)) {
      const { payload } = context;
      prNumber = payload.pull_request.number;
      if (
        !(payload.review.state === "approved" && payload.action === "submitted")
      ) {
        console.warn(
          `PR review for ${repo.full_name} #${prNumber} was not an approval. Skipping...`
        );
        return;
      }
    }

    // Catch-all
    if (prNumber === -1) {
      const name = context.name;
      console.warn(
        `No matching handler for context:${name} from repo:${repo.full_name}`
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
    if (!this.isPrMergeable(pr)) {
      console.warn(
        `${prDescription} has merge conflicts, pending CI checks or is merging to "main" branch. Skipping...`
      );
      return;
    }

    // Check if PR has valid merge comment
    if (!(await this.checkForValidMergeComment(pr.number))) {
      console.warn(`${prDescription} doesn't have merge comment. Skipping...`);
      return;
    }

    // Generate commit message
    const commitMsg = await this.createCommitMessage(pr);

    // Merge PR
    console.log(`Merging ${prDescription}`);
    const commitTitle = this.sanitizePrTitle(pr.title) + `(#${pr.number})`;
    await context.octokit.pulls.merge({
      owner: repo.owner.login,
      repo: pr.base.repo.name,
      pull_number: pr.number,
      merge_method: "squash",
      commit_title: commitTitle,
      commit_message: commitMsg,
    });
  }

  /**
   * Type guard that determines whether or not the provided context
   * is a StatusContext
   * @param context
   */
  isStatusContext(context: AutoMergerContext): context is StatusContext {
    return context.name === "status";
  }

  /**
   * Type guard that determines whether or not the provided context
   * is an IssueCommentContext
   * @param context
   */
  isIssueCommentContext(
    context: AutoMergerContext
  ): context is IssueCommentContext {
    return context.name.startsWith("issue_comment");
  }

  /**
   * Type guard that determines whether or not the provided context
   * is a PRReviewContext
   * @param context
   */
  isPRReviewContext(context: AutoMergerContext): context is PRReviewContext {
    return context.name.startsWith("pull_request_review");
  }

  /**
   * Looks in forked and source repos to determine the PR number associated
   * with the given commit SHA. Returns -1 if not found.
   * @param context
   */
  async getPRNumberfromSHA(context: StatusContext): Promise<number> {
    const repoName = context.payload.repository.name;
    const sourceRepoOwner = context.payload.repository.owner.login;
    const forkedRepoOwner = context.payload.repository.owner.login;

    for (const repoOwner of [forkedRepoOwner, sourceRepoOwner]) {
      try {
        const {
          data: prs,
        } = await context.octokit.repos.listPullRequestsAssociatedWithCommit({
          commit_sha: context.payload.sha,
          owner: repoOwner,
          repo: repoName,
        });
        if (!prs.length) continue;
        return prs[0].number;
      } catch (error) {
        continue;
      }
    }

    return -1;
  }

  /**
   * Returns true if the given comment is the merge comment string.
   * (Case-insensitive, trims leading & trailing whitespace)
   * @param comment
   */
  isMergeComment(comment: string): boolean {
    return comment.toLowerCase().trim() === MERGE_COMMENT;
  }

  /**
   * Returns true if the payload associated with the provided context
   * is from a GitHub Pull Request (as opposed to a GitHub Issue).
   * @param context
   */
  isPR(context: IssueCommentContext): boolean {
    return "pull_request" in context.payload.issue;
  }

  /**
   * Returns true if PR's checks are all passing and it is being
   * merged into the default branch.
   *
   * @param pr
   */
  isPrMergeable(pr: PullsGetResponseData): boolean {
    return (
      pr.mergeable_state === "clean" &&
      pr.mergeable === true &&
      pr.base.ref !== "main"
    );
  }

  /**
   * Returns true if the given PR number has the "okay to merge"
   * comment and it was posted by a user with "admin" or "write" permissions.
   * @param prNumber
   */
  async checkForValidMergeComment(prNumber: number): Promise<boolean> {
    const context = this.context;
    const repo = context.payload.repository;

    const allComments = await context.octokit.paginate(
      context.octokit.issues.listComments,
      {
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: prNumber,
      },
      (resp) =>
        resp.data.map((comment) => ({
          author: comment.user.login,
          body: comment.body,
        }))
    );

    const mergeComments = allComments.filter((comment) =>
      this.isMergeComment(comment.body)
    );

    const mergeCommentAuthors = mergeComments.map((comment) => comment.author);

    const permissions = await Promise.all(
      mergeCommentAuthors.map(async (actor) => {
        return (
          await context.octokit.repos.getCollaboratorPermissionLevel({
            owner: repo.owner.login,
            repo: repo.name,
            username: actor,
          })
        ).data.permission;
      })
    );

    return permissions.includes("admin") || permissions.includes("write");
  }

  async createCommitMessage(pr: PullsGetResponseData): Promise<string> {
    const context = this.context;
    let commitMsg = "";

    const prBody = strip(pr.body, {
      language: "html",
      preserveNewlines: false,
    }).trim();

    const authors = await this.getAuthors(pr);
    const approvers = await this.getApprovers(pr);
    const formatUserName = (user: UsersGetByUsernameResponseData): string => {
      if (user.name) {
        return `${user.name} (@${user.login})`;
      }
      return `@${user.login}`;
    };

    commitMsg += `${prBody}\n`;
    commitMsg += "\n";

    commitMsg += "Authors:\n";
    for (let i = 0; i < authors.length; i++) {
      const author = authors[i];
      commitMsg += `  - ${formatUserName(author)}\n`;
    }

    commitMsg += "\n";
    commitMsg += "Approvers:";
    if (approvers.length) commitMsg += "\n";
    if (!approvers.length) commitMsg += " None\n";
    for (let j = 0; j < approvers.length; j++) {
      const approver = approvers[j];
      commitMsg += `  - ${formatUserName(approver)}\n`;
    }
    commitMsg += "\n";
    commitMsg += `URL: ${pr.html_url}`;

    return commitMsg;
  }

  async getAuthors(
    pr: PullsGetResponseData
  ): Promise<UsersGetByUsernameResponseData[]> {
    const { octokit } = this.context;
    const uniqueAuthors: string[] = [pr.user.login];

    const commits = await octokit.paginate(octokit.pulls.listCommits, {
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      pull_number: pr.number,
    });

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      if (!commit.author) continue;
      const commitAuthor = commit.author.login;
      if (uniqueAuthors.includes(commitAuthor)) continue;
      uniqueAuthors.push(commitAuthor);
    }

    return Promise.all(
      uniqueAuthors.map(
        async (author) =>
          (await octokit.users.getByUsername({ username: author })).data
      )
    );
  }

  async getApprovers(
    pr: PullsGetResponseData
  ): Promise<UsersGetByUsernameResponseData[]> {
    const { octokit } = this.context;
    const uniqueApprovers: string[] = [];

    const reviewers = await octokit.paginate(octokit.pulls.listReviews, {
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      pull_number: pr.number,
    });
    const approvers = reviewers.filter((review) => review.state === "APPROVED");

    for (let i = 0; i < approvers.length; i++) {
      const approver = approvers[i];
      const commitAuthor = approver.user.login;
      if (uniqueApprovers.includes(commitAuthor)) continue;
      uniqueApprovers.push(commitAuthor);
    }

    return Promise.all(
      uniqueApprovers.map(
        async (approver) =>
          (
            await octokit.users.getByUsername({
              username: approver,
            })
          ).data
      )
    );
  }

  sanitizePrTitle(rawTitle): string {
    return rawTitle.replace(/\[[\s\S]*?\]/g, "").trim();
  }
}
