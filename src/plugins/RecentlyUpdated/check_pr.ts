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

import { createSetCommitStatus, isRapidsBotPR } from "../../shared";
import { PRContext, PullsListResponseData } from "../../types";
import { Context } from "probot";
import { OpsBotPlugin } from "../../plugin";

export const checkPR = async function (
  this: OpsBotPlugin,
  context: Context,
  pr: PRContext["payload"]["pull_request"] | PullsListResponseData[0],
  recently_updated_threshold: number
) {
  const prBaseBranch = pr.base.ref;
  const prHeadLabel = pr.head.label;

  const setCommitStatus = createSetCommitStatus(context.octokit, {
    context: "Recently Updated",
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    sha: pr.head.sha,
    target_url: "https://docs.rapids.ai/resources/recently-updated/",
  });

  this.logger.info({ pr }, "checking recent updates");

  await setCommitStatus("Checking if PR has recent updates...", "pending");

  if (isRapidsBotPR(pr)) {
    await setCommitStatus("Automated rapids-bot PR detected", "success");
    return;
  }

  const { data: resp } = await context.octokit.repos.compareCommitsWithBasehead(
    {
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      basehead: `${prBaseBranch}...${prHeadLabel}`,
    }
  );

  const behind_by = resp.behind_by;

  if (behind_by > recently_updated_threshold) {
    await setCommitStatus(
      `PR is ${behind_by} commits behind base branch. Merge latest changes`,
      "failure"
    );
    return;
  }

  await setCommitStatus("PR includes recent base branch changes", "success");
};
