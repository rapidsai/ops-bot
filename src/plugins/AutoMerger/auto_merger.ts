/*
* Copyright (c) 2022, NVIDIA CORPORATION.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import {
  AutoMergerContext,
  IssueCommentContext,
  PRReviewContext,
  PullsGetResponseData,
  StatusContext,
  UsersGetByUsernameResponseData,
} from "../../types";
import strip from "strip-comments";
import {
  Command,
  featureIsDisabled,
  issueIsPR,
  Permission,
  validCommentsExistByPredicate,
} from "../../shared";

export class AutoMerger {
  public context: AutoMergerContext;
  constructor(context: AutoMergerContext) {
    this.context = context;
  }

  async maybeMergePR(): Promise<any> {
    const context = this.context;
    if (await featureIsDisabled(context, "auto_merger")) return;
    const { repository: repo } = context.payload;
    let prNumbers: number[] = []; // will usually only contain 1 number, except in rare instances w/ status contexts

    // Handle "status" context
    if (this.isStatusContext(context)) {
      const sha = context.payload.sha;
      if (context.payload.state !== "success") {
        console.warn(
          `Status is not "success" for sha:${sha} in repo:${repo.full_name}. Skipping...`
        );
        return;
      }
      prNumbers = await this.getPRNumbersfromSHA(context);
      if (!prNumbers.length) {
        console.warn(
          `Could not find PR for sha:${sha} in repo:${repo.full_name}. Skipping...`
        );
        return;
      }
    }

    // Handle "issue_comment" context
    if (this.isIssueCommentContext(context)) {
      const comment = context.payload.comment.body;
      prNumbers.push(context.payload.issue.number);
      if (!issueIsPR(context)) {
        console.warn(
          `The following comment from ${repo.full_name} #${prNumbers[0]} was from an issue, not a PR: ${comment}.\n`,
          `Skipping...`
        );
        return;
      }
      if (!this.isMergeComment(comment)) {
        console.warn(
          `The following comment from ${repo.full_name} #${prNumbers[0]} was not a merge comment: ${comment}.\n`,
          `Skipping...`
        );
        return;
      }
    }

    // Handle "pull_request_review" context
    if (this.isPRReviewContext(context)) {
      const { payload } = context;
      prNumbers.push(payload.pull_request.number);
      if (payload.review.state !== "approved") {
        console.warn(
          `PR review for ${repo.full_name} #${prNumbers[0]} was not an approval. Skipping...`
        );
        return;
      }
    }

    // Catch-all
    if (!prNumbers.length) {
      const name = context.name;
      console.warn(
        `No matching handler for context:${name} from repo:${repo.full_name}`
      );
      return;
    }

    for (let i = 0; i < prNumbers.length; i++) {
      const prNumber = prNumbers[i];

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
      if(!(await validCommentsExistByPredicate(
        this.context,
        pr.number,
        [Permission.admin, Permission.write],
        comment => this.isMergeComment(comment.body || "")))) {
        console.warn(
          `${prDescription} doesn't have merge comment. Skipping...`
        );
        return;
      }

      // Generate commit message
      const commitMsg = await this.createCommitMessage(pr);

      // Merge PR
      console.log(`Merging ${prDescription}`);
      const commitTitle = this.sanitizePrTitle(pr.title) + ` (#${pr.number})`;
      await context.octokit.pulls.merge({
        owner: repo.owner.login,
        repo: repo.name,
        pull_number: pr.number,
        merge_method: "squash",
        commit_title: commitTitle,
        commit_message: commitMsg,
      });
    }
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
   * Looks in forked and source repos to determine the PR numbers associated
   * with the given commit SHA. Returns empty array if no PRs found.
   * @param context
   */
  async getPRNumbersfromSHA(context: StatusContext): Promise<number[]> {
    const repoName = context.payload.repository.name;
    const sourceRepoOwner = context.payload.repository.owner.login;
    const repoOwners = [sourceRepoOwner];
    const forkedRepoOwner = context.payload.commit.author?.login;
    if (forkedRepoOwner) repoOwners.push(forkedRepoOwner);

    let prNumbers: number[] = [];

    for (const repoOwner of repoOwners) {
      try {
        const { data: prs } =
          await context.octokit.repos.listPullRequestsAssociatedWithCommit({
            commit_sha: context.payload.sha,
            owner: repoOwner,
            repo: repoName,
          });
        if (!prs.length) continue;
        prNumbers = [...prNumbers, ...prs.map((pr) => pr.number)];
      } catch (error) {
        continue;
      }
    }

    return prNumbers;
  }

  /**
   * Returns true if the given comment is the merge comment string.
   * @param comment
   */
  isMergeComment(comment: string): boolean {
    return Boolean(comment.match(Command.Merge));
  }

  /**
   * Returns true if PR's checks are all passing and it is being
   * merged into the default branch.
   *
   * @param pr
   */
  isPrMergeable(pr: PullsGetResponseData): boolean {
    const repo = pr.base.repo.name;
    const number = pr.number;
    const mergeable_state = pr.mergeable_state;
    const mergeable = pr.mergeable;
    const baseRef = pr.base.ref;
    console.log(`${repo} ${number} merge stats:`); // i.e. "cudf 3075 merge stats"
    console.log(
      JSON.stringify({
        mergeable_state,
        mergeable,
        baseRef,
      })
    );
    return (
      (mergeable_state === "clean" || mergeable_state === "unstable") &&
      mergeable === true &&
      baseRef !== "main"
    );
  }

  /**
   * Returns description text between "## description" or beginning
   * and "## checklist" or end of the string. (case insensitive)
   *
   * @param prBody PR's body text
   */
  extractDescription(prBody: string): string {
    let descrStart = prBody.toLowerCase().indexOf("## description");
    if (descrStart == -1) {
      descrStart = 0;
    } else {
      descrStart += "## description".length;
    }
    let descrEnd = prBody.toLowerCase().indexOf("## checklist", descrStart);
    if (descrEnd == -1) {
      descrEnd = prBody.length;
    }
    return prBody.slice(descrStart, descrEnd);
  }

  /**
   * Returns a string used for the squash commit that contains the PR body,
   * PR authors, and PR approvers.
   * @param pr
   */
  async createCommitMessage(pr: PullsGetResponseData): Promise<string> {
    let commitMsg = "";

    const prBody = strip(this.extractDescription(pr.body || ""), {
      language: "html",
      preserveNewlines: false,
    }).trim();

    const authors = await this.getAuthors(pr);
    const approvers = await this.getApprovers(pr);
    const formatUserName = (user: UsersGetByUsernameResponseData): string => {
      if (user.name) {
        return `${user.name} (${user.html_url})`;
      }
      return `${user.html_url}`;
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

  /**
   * Returns the profiles for all of the authors of a given PR
   * @param pr
   */
  async getAuthors(
    pr: PullsGetResponseData
  ): Promise<UsersGetByUsernameResponseData[]> {
    const { octokit } = this.context;
    const uniqueAuthors: string[] = [];
    const prAuthor = pr.user?.login;
    if (prAuthor) uniqueAuthors.push(prAuthor);

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

  /**
   * Returns the profiles for all of the approvers of a given PR
   * @param pr
   */
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
      if (!approver.user) continue;
      const approvalAuthor = approver.user.login;
      if (uniqueApprovers.includes(approvalAuthor)) continue;
      uniqueApprovers.push(approvalAuthor);
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

  /**
   * Removes square brackets, [], and their contents from a given string
   * @param rawTitle
   */
  sanitizePrTitle(rawTitle): string {
    return rawTitle.replace(/\[[\s\S]*?\]/g, "").trim();
  }
}
