import {
  createSetCommitStatus,
  isReleasePR,
  isVersionedBranch,
  getVersionFromBranch,
} from "../../shared";
import { PRContext, ProbotOctokit, PullsListResponseData } from "../../types";

export const checkPR = async (
  octokit: ProbotOctokit,
  pr: PRContext["payload"]["pull_request"] | PullsListResponseData[0]
) => {
  const prBaseBranch = pr.base.ref;
  const repoDefaultBranchVersion = getVersionFromBranch(
    pr.base.repo.default_branch
  );
  const errDescription = "Base branch is not under active development";
  const setCommitStatus = createSetCommitStatus(octokit, {
    context: "Branch Checker",
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    sha: pr.head.sha,
  });

  await setCommitStatus("Checking base branch...", "pending");

  if (isReleasePR(pr)) {
    return await setCommitStatus("Release PR detected", "success");
  }

  if (!isVersionedBranch(prBaseBranch)) {
    return await setCommitStatus(errDescription, "failure");
  }

  const prBaseBranchVersion = getVersionFromBranch(prBaseBranch);

  if (isActiveBranch(repoDefaultBranchVersion, prBaseBranchVersion)) {
    return await setCommitStatus(
      "Base branch is under active development",
      "success"
    );
  }

  await setCommitStatus(errDescription, "failure");
};

/**
 * Returns true if the PR base branch version is currently
 * under active development.
 *
 * @param defaultBranchVersion
 * @param prBaseBranchVersion
 */
const isActiveBranch = (
  defaultBranchVersion: number,
  prBaseBranchVersion: number
) => {
  return (
    prBaseBranchVersion === defaultBranchVersion ||
    prBaseBranchVersion === defaultBranchVersion + 1
  );
};
