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
import {
  isVersionedBranch,
  getVersionFromBranch,
} from "../../shared";
import { basename } from "path";
import { Context } from "probot";
import { PushEventsType } from ".";


export class ForwardMerger extends OpsBotPlugin {
  context: Context;
  currentBranch: string;
  repo: PayloadRepository;

  constructor(context: Context, private payload: Context<PushEventsType>["payload"]) {
    super("forward_merger", context);
    this.context = context;
    this.currentBranch = basename(this.payload.ref);
    this.repo = payload.repository;
  }

  async mergeForward() {
    if (await this.pluginIsDisabled()) return;

    if (!isVersionedBranch(this.currentBranch)) {
      this.logger.info("Will not merge forward on non-versioned branch");
      return;
    }

    const branches = await this.getBranches();
    const sortedBranches = this.sortBranches(branches);
    const nextBranch = this.getNextBranch(sortedBranches);

    if(!nextBranch) return

    const { data: pr } = await this.context.octokit.pulls.create({
      owner: this.repo.owner.login,
      repo: this.repo.name,
      title: "Forward-merge " + this.currentBranch + " into " + nextBranch,
      head: this.currentBranch,
      base: nextBranch,
      maintainer_can_modify: true,
      body: `Forward-merge triggered by push to ${this.currentBranch} that creates a PR to keep ${nextBranch} up-to-date. If this PR is unable to be immediately merged due to conflicts, it will remain open for the team to manually merge. See [forward-merger docs](https://docs.rapids.ai/maintainers/forward-merger/) for more info.`,
    });

    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      this.logger.info("Merging PR");
      await this.context.octokit.pulls.merge({
        owner: this.repo.owner.login,
        repo: this.repo.name,
        pull_number: pr.number,
        sha: pr.head.sha,
      });
      await this.issueComment(pr.number, "**SUCCESS** - forward-merge complete.");
    } catch (error) {
      await this.issueComment(pr.number, "**FAILURE** - Unable to forward-merge due to an error, **manual** merge is necessary. Do not use the `Resolve conflicts` option in this PR, follow these instructions https://docs.rapids.ai/maintainers/forward-merger/ \n **IMPORTANT**: When merging this PR, do not use the [auto-merger](https://docs.rapids.ai/resources/auto-merger/) (i.e. the `/merge` comment). Instead, an admin must manually merge by changing the merging strategy to `Create a Merge Commit`. Otherwise, history will be lost and the branches become incompatible.");
    }
  }

  async getBranches() {
    const branches = await this.context.octokit.paginate(this.context.octokit.repos.listBranches, {
      owner: this.repo.owner.login,
      repo: this.repo.name,
    });
    return branches.filter((branch) => isVersionedBranch(branch.name)).map((branch) => branch.name);
  }

  sortBranches(branches: string[]) {
    return branches.sort((a, b) => {
      const [yearA, monthA] = getVersionFromBranch(a).split('.').map(Number)
      const [yearB, monthB] = getVersionFromBranch(b).split('.').map(Number)
      if (yearA !== yearB) {
        return yearA - yearB;
      } else {
        return monthA - monthB;
      }
    });
  }

  getNextBranch(sortedBranches: string[]) {
    const currentBranchIndex = sortedBranches.findIndex(
      (branch) => branch === this.currentBranch
    );
    const nextBranch = sortedBranches[currentBranchIndex + 1];
    return nextBranch;
  }

  async issueComment(id, comment) {
    await this.context.octokit.issues.createComment({
      owner: this.repo.owner.login,
      repo: this.repo.name,
      issue_number: id,
      body: comment,
    });
  }
}