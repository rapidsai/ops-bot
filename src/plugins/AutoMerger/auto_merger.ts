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
  PullsGetResponseData,
  UsersGetByUsernameResponseData,
  IssuesCommentsResponseData,
} from "../../types.ts";
import strip from "strip-comments";
import {
  isMergeComment,
  Permission,
  // validCommentsExistByPredicate,
  getMergeMethod,
  // isNoSquashMergeComment,
  isManualForwardMergeBranch,
  parseManualForwardMergeBranch,
  isRapidsBotPR,
  isGPUTesterPR,
  isOpsBotTestingPR,
} from "../../shared.ts";
import { OpsBotPlugin } from "../../plugin.ts";
import { PRNumberResolver } from "./resolve_prs.ts";

export class AutoMerger extends OpsBotPlugin {
  public context: AutoMergerContext;
  constructor(context: AutoMergerContext) {
    super("auto_merger", context);
    this.context = context;
  }

  async maybeMergePR(): Promise<any> {
    const context = this.context;
    if (await this.pluginIsDisabled()) return;
    const { repository: repo } = context.payload;

    const prNumbers = await new PRNumberResolver(
      context,
      this.logger
    ).getPrNumbers();

    for (let i = 0; i < prNumbers.length; i++) {
      const prNumber = prNumbers[i];

      // Get PR info
      const { data: pr } = await context.octokit.pulls.get({
        owner: repo.owner.login,
        repo: repo.name,
        pull_number: prNumber,
      });

      // Check if PR is mergeable (all green)
      if (!this.isPrMergeable(pr, repo.default_branch)) {
        this.logger.info({ pr }, "PR not mergeable");
        return;
      }

      // Check if PR has valid merge comment and determine merge method
      const mergeCommentResult = await this.getValidMergeComment(pr);
      if (!mergeCommentResult) {
        this.logger.info("no valid merge comment on PR");
        return;
      }

      const { mergeMethod, commentBody } = mergeCommentResult;
      this.logger.info("mergeCommentResult is" + mergeMethod + " " + commentBody)

      // Additional validation for bot PRs and manual forward-merge PRs
      if (!await this.validateMergeRequest(pr, mergeMethod, commentBody)) {
        return;
      }

      // For nosquash (merge commit) merges, we need to validate additional criteria
      if (mergeMethod === "merge") {
        try {
          const validationResult = await this.validateNoSquashMerge(pr);
          if (!validationResult.success) {
            // Add a specific message prefix for non-fixable failures to enable lockout detection
            if (!validationResult.isFixableError) {
              await this.issueComment(
                pr.number, 
                `This PR has failed nosquash validation checks: ${validationResult.message}`
              );
            } else {
              // For fixable errors, just post the message without the prefix that triggers lockout
              await this.issueComment(pr.number, validationResult.message);
            }
            
            return;
          }
        } catch (error) {
          this.logger.error({ error }, "Error validating nosquash merge");
          await this.issueComment(
            pr.number, 
            "Error validating this PR for a non-squash merge. Please contact @rapids-devops on Slack for assistance."
          );
          return;
        }
      }

      // For squash merges, generate commit message
      let commitTitle: string | undefined;
      let commitMsg: string | undefined;
      
      if (mergeMethod === "squash") {
        commitMsg = await this.createCommitMessage(pr);
        commitTitle = `${pr.title.trim()} (#${pr.number})`;
      }

      // Merge PR
      this.logger.info({ pr, mergeMethod }, "merging PR");
      try {
        await context.octokit.pulls.merge({
          owner: repo.owner.login,
          repo: repo.name,
          pull_number: pr.number,
          merge_method: mergeMethod,
          commit_title: commitTitle,
          commit_message: commitMsg,
        });
      } catch (error: any) {
        this.logger.error({ error }, "Error merging PR");
        await this.issueComment(
          pr.number,
          `Failed to merge PR using ${mergeMethod} strategy. Error: ${error.message || "Unknown error"}`
        );
        return;
      }
    }
  }

  /**
   * Validate whether a merge command should be processed on this PR
   */
  async validateMergeRequest(
    pr: PullsGetResponseData, 
    mergeMethod: "squash" | "merge", 
    commentBody: string
  ): Promise<boolean> {
    // Rule 1: Reject any merge command on bot-authored PRs (3.3.1)
    if (isRapidsBotPR(pr) || isGPUTesterPR(pr)) {
      await this.issueComment(
        pr.number,
        "AutoMerger commands (like `/merge` or `/merge nosquash`) cannot be used directly on PRs authored by bots. " +
        "To resolve conflicts from a failed forward-merge, please create a new, separate pull request with the resolved changes, " +
        "then use `/merge nosquash` on that new PR."
      );
      return false;
    }

    // Rule 2: Reject `/merge` (squash) on manual forward-merge resolution PRs (3.3.2)
    const branchName = pr.head?.ref || "";
    if (mergeMethod === "squash" && isManualForwardMergeBranch(branchName)) {
      await this.issueComment(
        pr.number,
        "This PR appears to be a manual resolution for a forward-merge. Such PRs must use a non-squash merge strategy " +
        "to preserve commit history. Please use the `/merge nosquash` command instead."
      );
      return false;
    }

    return true;
  }

  /**
   * Get a valid merge comment from the PR and determine the merge method
   * Processes comments from newest to oldest so the most recent command takes precedence
   */
  async getValidMergeComment(pr: PullsGetResponseData): Promise<{ mergeMethod: "squash" | "merge", commentBody: string } | null> {
    const { repository: repo } = this.context.payload;
    
    // Get all comments on the PR
    const allComments = await this.context.octokit.paginate(
      this.context.octokit.issues.listComments,
      {
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: pr.number,
      }
    );

    // Filter for merge comments
    const mergeComments = allComments.filter(comment => 
      isMergeComment(comment.body || "")
    );
    
    // Sort comments by creation time, newest first
    const sortedMergeComments = [...mergeComments].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    // Check if there are any valid merge comments by users with appropriate permissions
    // Processing from newest to oldest
    for (const comment of sortedMergeComments) {
      const userPermission = await this.context.octokit.repos.getCollaboratorPermissionLevel({
        owner: repo.owner.login,
        repo: repo.name,
        username: comment.user?.login as string,
      });

      const requiredPermissions = [Permission.admin, Permission.write, Permission.maintain];
      if (requiredPermissions.includes(userPermission.data.permission)) {
        // Valid comment found, determine merge method
        const commentBody = comment.body || "";
        const mergeMethod = getMergeMethod(commentBody);
        this.logger.info(`Using merge command from comment created at ${comment.created_at}: ${commentBody} (method: ${mergeMethod})`);
        return { mergeMethod, commentBody };
      }
    }

    return null;
  }

  /**
   * Validates a PR for a nosquash merge
   * @param pr The pull request to validate
   * @returns An object with success status and message
   */
  async validateNoSquashMerge(pr: PullsGetResponseData): Promise<{ 
    success: boolean; 
    message: string; 
    isFixableError?: boolean;
  }> {
    this.logger.info("Validating no squash merge PR:", pr)
    const { repository: repo } = this.context.payload;
    
    // Check if this PR has already failed non-commit validation by looking for our failure comment
    const allComments = await this.context.octokit.paginate(
      this.context.octokit.issues.listComments,
      {
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: pr.number,
      }
    );
    
    // Check if PR has a permanent lockout from previous validation failures
    if (this.hasPermanentNosquashValidationFailure(allComments)) {
      return { 
        success: false, 
        message: "This PR has previously failed nosquash validation checks. Please contact @rapids-devops on Slack for assistance.",
        isFixableError: false
      };
    }

    // 3.3.3: Parse branch name to identify source/target branches
    const branchName = pr.head?.ref || "";
    const parsedBranch = parseManualForwardMergeBranch(branchName);
    
    if (!parsedBranch) {
      return { 
        success: false, 
        message: "Could not determine original ForwardMerger PR from branch name. The branch name should follow the pattern " + 
        "`<target_branch>-merge-<source_branch>` (e.g., `branch-25.06-merge-branch-25.04` or `main-merge-release/25.06`). " +
        "Please contact @rapids-devops on Slack for assistance.",
        isFixableError: true
      };
    }
    
    // Search for original forward-merger PR
    const sourceBranch = parsedBranch.source;
    const targetBranch = parsedBranch.target;
    
    const { data: searchResults } = await this.context.octokit.search.issuesAndPullRequests({
      q: (`repo:${repo.full_name} is:pr is:open head:${sourceBranch} base:${targetBranch} author:app/rapids-bot author:app/ops-bot-testing`),
    });
    
    if (searchResults.items.length === 0) {
      return {
        success: false, 
        message: `Could not find any open bot-authored PRs from ${sourceBranch} to ${targetBranch}. ` + 
                "Please contact @rapids-devops on Slack for assistance." 
      };
    }
    
    if (searchResults.items.length > 1) {
      return {
        success: false, 
        message: `Found multiple (${searchResults.items.length}) open bot-authored PRs from ${sourceBranch} to ${targetBranch}. ` + 
                "Cannot uniquely identify which PR this is resolving. Please contact @rapids-devops on Slack for assistance." 
      };
    }
    
    // We found exactly one matching PR
    const originalPrNumber = searchResults.items[0].number;
    
    // Fetch full details of the original PR
    const { data: originalPr } = await this.context.octokit.pulls.get({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: originalPrNumber,
    });
    
    // Validate original PR author
    if (!isRapidsBotPR(originalPr) && !isGPUTesterPR(originalPr) && !isOpsBotTestingPR(originalPr)) {
      return { 
        success: false, 
        message: `Original PR #${originalPrNumber} was not authored by a known bot account. ` + 
                "Please contact @rapids-devops on Slack for assistance." 
      };
    }
    
    // 3.3.5: Base branch consistency check
    if (pr.base.ref !== originalPr.base.ref) {
      return { 
        success: false, 
        message: `Base branch of this PR (${pr.base.ref}) does not match the base branch of original PR #${originalPrNumber} (${originalPr.base.ref}). ` + 
                "Please correct the base branch and try again.",
        isFixableError: true // Mark as fixable error that doesn't cause lockout
      };
    }
    
    // 3.3.6: Commit history integrity validation
    const originalCommits = await this.context.octokit.paginate(
      this.context.octokit.pulls.listCommits,
      {
        owner: repo.owner.login,
        repo: repo.name,
        pull_number: originalPrNumber,
      }
    );
    
    const originalCommitShas = originalCommits.map(commit => commit.sha);
    
    if (originalCommitShas.length === 0) {
      return { 
        success: false, 
        message: `Original PR #${originalPrNumber} unexpectedly has no commits. Cannot validate commit history integrity. ` + 
                "Please contact @rapids-devops on Slack for assistance." 
      };
    }
    
    const currentPrCommits = await this.context.octokit.paginate(
      this.context.octokit.pulls.listCommits,
      {
        owner: repo.owner.login,
        repo: repo.name,
        pull_number: pr.number,
      }
    );
    
    const currentPrCommitShas = currentPrCommits.map(commit => commit.sha);
    
    // Check if all original commits are present in current PR
    const missingCommits = originalCommitShas.filter(sha => !currentPrCommitShas.includes(sha));
    
    if (missingCommits.length > 0) {
      return { 
        success: false, 
        message: `Commit history integrity check failed: not all commits from original PR #${originalPrNumber} ` + 
                "appear to be present individually in this PR's history. This usually happens if commits were squashed " + 
                "during the manual resolution process. Please ensure all original commits are preserved individually. " + 
                "You can fix this and try the `/merge nosquash` command again.",
        isFixableError: true
      };
    }
    
    // All validations passed
    return { 
      success: true, 
      message: `Validation successful. Proceeding with non-squash merge of PR #${pr.number}.` 
    };
  }

  /**
   * Checks if this PR has a previous permanent validation failure 
   * that should prevent further nosquash merge attempts.
   * 
   * Note: Fixable errors (like commit history or base branch issues) don't cause lockout
   */
  private hasPermanentNosquashValidationFailure(comments: IssuesCommentsResponseData): boolean {
    return comments.some(comment => {
      const isPermanentFailureFormat = (comment.body || "").includes("This PR has failed nosquash validation checks:");
      
      return isPermanentFailureFormat;
    });
  }

  /**
   * Post a comment on an issue/PR
   */
  async issueComment(prNumber: number, message: string): Promise<void> {
    const { repository: repo } = this.context.payload;
    await this.context.octokit.issues.createComment({
      owner: repo.owner.login,
      repo: repo.name,
      issue_number: prNumber,
      body: message,
    });
  }

  /**
   * Returns true if PR's checks are all passing and it is being
   * merged into the default branch.
   *
   * @param pr
   */
  isPrMergeable(pr: PullsGetResponseData, default_branch: string): boolean {
    const mergeable_state = pr.mergeable_state;
    const mergeable = pr.mergeable;
    const baseRef = pr.base.ref;
    return (
      (mergeable_state === "clean" || mergeable_state === "unstable") &&
      mergeable === true &&
      (baseRef !== "main" || default_branch === "main")
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

    return (
      await Promise.all(
        uniqueAuthors.map(async (author) => {
          try {
            return (await octokit.users.getByUsername({ username: author }))
              .data;
          } catch (error) {
            return null;
          }
        })
      )
    ).filter((x): x is UsersGetByUsernameResponseData => Boolean(x));
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

    return (
      await Promise.all(
        uniqueApprovers.map(async (approver) => {
          try {
            return (await octokit.users.getByUsername({ username: approver }))
              .data;
          } catch (error) {
            return null;
          }
        })
      )
    ).filter((x): x is UsersGetByUsernameResponseData => Boolean(x));
  }
}
