/*
 * Copyright (c) 2024, NVIDIA CORPORATION.
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

import { OpsBotPlugin } from "../../plugin";
import { PayloadRepository } from "../../types";
import { isVersionedBranch, getVersionFromBranch, isVersionedUCXBranch } from "../../shared";
import { basename } from "path";
import { Context } from "probot";
import { Octokit } from "@octokit/rest"


export class ForwardMerger extends OpsBotPlugin {
  context: Context;
  currentBranch: string;
  repo: PayloadRepository;

  constructor(
    context: Context,
    private payload: Context<"push">["payload"]
  ) {
    super("forward_merger", context);
    this.context = context;
    this.currentBranch = basename(this.payload.ref);
    this.repo = payload.repository;
  }

  async mergeForward(): Promise<void> {
    if (await this.pluginIsDisabled()) return;

    if (!isVersionedBranch(this.currentBranch) && !isVersionedUCXBranch(this.currentBranch)) {
      this.logger.info("Will not merge forward on non-versioned branch");
      return;
    }

    const branches = await this.getBranches();
    const sortedBranches = this.sortBranches(branches);
    const nextBranch = this.getNextBranch(sortedBranches);

    if (!nextBranch) return;

    const { data: pr } = await this.context.octokit.pulls.create({
      owner: this.repo.owner.login,
      repo: this.repo.name,
      title: `Forward-merge ${this.currentBranch} into ${nextBranch}`,
      head: this.currentBranch,
      base: nextBranch,
      maintainer_can_modify: false,
      body: `Forward-merge triggered by push to ${this.currentBranch} that creates a PR to keep ${nextBranch} up-to-date. If this PR is unable to be immediately merged due to conflicts, it will remain open for the team to manually merge. See [forward-merger docs](https://docs.rapids.ai/maintainers/forward-merger/) for more info.`,
    });

    try {
      this.logger.info("Merging PR");
      const gpuTesterClient = this.initNewClient(); // see https://github.com/rapidsai/ops/issues/3159#issue-2198146626 for why we're initializing a new client.
      await gpuTesterClient.pulls.merge({
        owner: this.repo.owner.login,
        repo: this.repo.name,
        pull_number: pr.number,
        sha: pr.head.sha,
      });
    } catch (error) {
      this.logger.info(`Error during forward-merge: ${JSON.stringify(error)}`)
      await this.issueComment(
        pr.number,
        "**FAILURE** - Unable to forward-merge due to an error, **manual** merge is necessary. Do not use the `Resolve conflicts` option in this PR, follow these instructions https://docs.rapids.ai/maintainers/forward-merger/ \n\n**IMPORTANT**: When merging this PR, do not use the [auto-merger](https://docs.rapids.ai/resources/auto-merger/) (i.e. the `/merge` comment). Instead, an admin must manually merge by changing the merging strategy to `Create a Merge Commit`. Otherwise, history will be lost and the branches become incompatible."
      );
      return;
    }

    await this.issueComment(
      pr.number,
      "**SUCCESS** - forward-merge complete."
    );
  }

  initNewClient(): InstanceType<typeof Octokit> {
    return new Octokit({ auth: process.env.GPUTESTER_PAT });
  }

  async getBranches(): Promise<string[]> {
    const branches = await this.context.octokit.paginate(
      this.context.octokit.repos.listBranches,
      {
        owner: this.repo.owner.login,
        repo: this.repo.name,
      }
    );
    return branches
      .filter((branch) => isVersionedBranch(branch.name))
      .map((branch) => branch.name);
  }

  sortBranches(branches: string[]): string[] {
    return branches.sort((a, b) => {
      const [yearA, monthA] = getVersionFromBranch(a).split(".").map(Number);
      const [yearB, monthB] = getVersionFromBranch(b).split(".").map(Number);
      if (yearA !== yearB) {
        return yearA - yearB;
      } else {
        return monthA - monthB;
      }
    });
  }

  getNextBranch(sortedBranches: string[]): string | undefined {
    const currentBranchIndex = sortedBranches.findIndex(
      (branch) => branch === this.currentBranch
    );
    const nextBranch = sortedBranches[currentBranchIndex + 1];
    return nextBranch;
  }

  async issueComment(id, comment): Promise<void> {
    await this.context.octokit.issues.createComment({
      owner: this.repo.owner.login,
      repo: this.repo.name,
      issue_number: id,
      body: comment,
    });
  }
}
