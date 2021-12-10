import {
  CommitStatus,
  AutoMergerContext,
  ProbotOctokit,
  PullsGetResponseData,
  IssueCommentContext,
  UsersGetByUsernameResponseData,
} from "./types";
import strip from "strip-comments";

/**
 * RegEx representing RAPIDS branch name patterns
 * (i.e. "branch-21.06", "branch-22.08", etc.)
 */
export const versionedBranchExp = /^branch-\d\d\.\d\d$/;

/**
 * Returns true if the provided string is a versioned branch
 * (i.e. "branch-21.06", "branch-22.08", etc.)
 * @param branchName
 */
export const isVersionedBranch = (branchName: string): boolean => {
  return Boolean(branchName.match(versionedBranchExp));
};

/**
 * Returns the RAPIDS version from a versioned branch name
 */
export const getVersionFromBranch = (branchName: string): string => {
  return branchName.split("-")[1];
};

/**
 * Returns an async function that will set a status on a given
 * commit. The returned function accepts a description, a state,
 * and an optional target URL.
 */
export const createSetCommitStatus = (
  octokit: ProbotOctokit,
  { context, owner, repo, sha, target_url = "" }: CommitStatus
) => {
  type StateStrings = "success" | "failure" | "error" | "pending";

  const initialTargetUrl = target_url;
  return async (
    description: string,
    state: StateStrings,
    target_url = initialTargetUrl
  ) => {
    await octokit.repos.createCommitStatus({
      context,
      owner,
      repo,
      sha,
      state,
      description,
      target_url,
    });
  };
};

export const isReleasePR = (
  pullRequest: Pick<PullsGetResponseData, "title" | "user">
): boolean => {
  return (
    pullRequest.user.login === "GPUtester" &&
    pullRequest.title.toLowerCase().includes("[release]")
  );
};

/**
 * Returns true if the PR has a label that includes the text "DO NOT MERGE"
 */
export const hasDoNotMergeLabel = (pr: PullsGetResponseData): boolean => {
  return pr.labels.some(label => label.name.trim().toLowerCase().includes('do not merge'))
};

/**
 * Returns true if the payload associated with the provided context
 * is from a GitHub Pull Request (as opposed to a GitHub Issue).
 * @param context
 */
export const isPR = (context: IssueCommentContext): boolean => {
  return "pull_request" in context.payload.issue;
};

/**
 * Async function to create the string used for the squash commit
 * that contains the PR body, PR authors, and PR approvers.
 * @param pr
 */
export const createCommitMessage = async (
  pr: PullsGetResponseData,
  context: AutoMergerContext,
): Promise<string> => {
  let commitMsg = "";
 
  const prBody = strip(pr.body || "", {
    language: "html",
    preserveNewlines: false,
  }).trim();
 
  const authors = await getAuthors(pr, context);
  const approvers = await getApprovers(pr, context);
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
};

/**
 * Removes square brackets, [], and their contents from a given string
 * @param rawTitle
 */
export const sanitizePrTitle = (rawTitle: string): string => {
  return rawTitle.replace(/\[[\s\S]*?\]/g, "").trim();
};


/*
 * UNEXPORTED HELPER FUNCTIONS BELOW
 */

/**
 * Async function to get the profiles for all of the authors
 * of a given PR
 * @param pr
 */
const getAuthors = async (
  pr: PullsGetResponseData,
  context: AutoMergerContext,
): Promise<UsersGetByUsernameResponseData[]> => {
  const { octokit } = context;
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
};

/**
 * Returns an async function to get the profiles for all of the
 * approvers of a given PR
 * @param pr
 */
const getApprovers = async (
  pr: PullsGetResponseData,
  context: AutoMergerContext,
): Promise<UsersGetByUsernameResponseData[]> => {
  const { octokit } = context;
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
};


