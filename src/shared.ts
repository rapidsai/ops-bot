import { CommitStatus, ProbotOctokit, PullsGetResponseData } from "./types";

/**
 * RegEx representing RAPIDS branch name patterns
 * (i.e. "branch-0.18", "branch-0.19", etc.)
 */
export const versionedBranchExp = /^branch-0\.\d{1,3}$/;

/**
 * Returns true if the provided string is a versioned branch
 * (i.e. "branch-0.18", "branch-0.19", etc.)
 * @param branchName
 */
export const isVersionedBranch = (branchName: string): boolean => {
  return Boolean(branchName.match(versionedBranchExp));
};

/**
 * Returns the RAPIDS version from a branch name, or
 * NaN if the branch name is not versioned.
 */
export const getVersionFromBranch = (branchName: string): number => {
  return parseInt(branchName.split(".")[1]);
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
