import { CommitStatus, ProbotOctokit, PullsGetResponseData } from "./types";

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
 * commit. The returned function accepts a description and a state.
 */
export const createSetCommitStatus = (
  octokit: ProbotOctokit,
  { context, owner, repo, sha }: CommitStatus
) => {
  type StateStrings = "success" | "failure" | "error" | "pending";

  return async (description: string, state: StateStrings) => {
    await octokit.repos.createCommitStatus({
      context,
      owner,
      repo,
      sha,
      state,
      description,
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
