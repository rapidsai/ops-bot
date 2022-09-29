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
  createSetCommitStatus,
  isGPUTesterPR,
  isVersionedBranch,
  getVersionFromBranch,
} from "../../shared";
import { PRContext, ProbotOctokit, PullsListResponseData } from "../../types";
import axios from "axios";

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

  console.log("Checking base branch on PR:", JSON.stringify(pr));

  await setCommitStatus("Checking base branch...", "pending");

  if (isGPUTesterPR(pr)) {
    return await setCommitStatus("Automated GPUTester PR detected", "success");
  }

  if (!isVersionedBranch(prBaseBranch)) {
    return await setCommitStatus(errDescription, "failure");
  }

  const prBaseBranchVersion = getVersionFromBranch(prBaseBranch);

  if (await isActiveBranch(repoDefaultBranchVersion, prBaseBranchVersion)) {
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
const isActiveBranch = async (
  defaultBranchVersion: string,
  prBaseBranchVersion: string
) => {
  if (prBaseBranchVersion === defaultBranchVersion) {
    return true;
  }

  const { data: releases } = await axios.get(
    "https://raw.githubusercontent.com/rapidsai/docs/gh-pages/_data/releases.json"
  );
  const nextNightlyBranchVersion = releases["next_nightly"]["version"];

  if (prBaseBranchVersion === nextNightlyBranchVersion) {
    return true;
  }
  return false;
};
