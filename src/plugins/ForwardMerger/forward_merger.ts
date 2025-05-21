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

import { OpsBotPlugin } from "../../plugin.ts";
import { PayloadRepository } from "../../types.ts";
import { isVersionedBranch, getVersionFromBranch, isVersionedUCXBranch } from "../../shared.ts";
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
    this.currentBranch = this.payload.ref.replace("refs/heads/", "");
    this.repo = payload.repository;
  }

  /**
   * Extracts the version (e.g., "25.02") from a release branch name.
   * @param branchName The name of the branch (e.g., "release/25.02").
   * @returns The version string or null if the format is incorrect.
   */
  getVersionFromReleaseBranch(branchName: string): string | null {
    const versionMatch = branchName.match(/^release\/(\d+\.\d{2})$/);
    return versionMatch ? versionMatch[1] : null;
  }

  /**
   * Checks if a tag name corresponds to a non-alpha release tag for a given version.
   * Example: Checks if "v25.02.00" is a non-alpha tag for version "25.02".
   * @param tagName The tag name (e.g., "v25.02.00", "v25.02.00a1").
   * @param version The release version (e.g., "25.02").
   * @returns True if the tag is a non-alpha release tag for the version, false otherwise.
   */
  isNonAlphaReleaseTag(tagName: string, version: string): boolean {
    // Ensure tagName is a string
    if (typeof tagName !== 'string') {
      return false;
    }
    // Pattern: starts with 'v', followed by the escaped version, a literal dot, then one or more digits, and nothing after.
    const versionRegex = version.replace('.', '\\.'); // Escape dot for regex
    const nonAlphaTagPattern = new RegExp(`^v${versionRegex}\\.(\\d+)$`);
    return nonAlphaTagPattern.test(tagName);
  }

  isReleaseBranch(branchName: string): boolean {
    return branchName.startsWith("release/");
  }

  /**
   * Checks if any non-alpha tags exist for a given version.
   * @param version The version string (e.g., "25.02").
   * @param tags The array of tags to check.
   * @returns True if any non-alpha tag exists for the version, false otherwise.
   */
  async anyNonAlphaTagsForVersion(version: string, tags: any[]): Promise<boolean> {
    const hasNonAlphaTag = tags.some(tag => {
      const matches = this.isNonAlphaReleaseTag(tag.name, version);
      this.logger.info(`Tag ${tag.name} matches pattern: ${matches}`);
      return matches;
    });

    if (hasNonAlphaTag) {
      this.logger.info(`Found non-alpha tag for version ${version}`);
    } else {
      this.logger.info(`No non-alpha tag found for version ${version}`);
    }

    return hasNonAlphaTag
  }

  /**
   * Checks if a release branch has a non-alpha tag for a given version.
   * @returns True if a non-alpha tag exists for the release branch version, false otherwise.
   */
  async hasNonAlphaTag(): Promise<boolean> {
    try {
      // Extract version from the release branch (e.g., 25.02 from release/25.02)
      const version = this.getVersionFromReleaseBranch(this.currentBranch);
      if (!version) {
        this.logger.info(`Could not extract version from branch name: ${this.currentBranch}`);
        return false;
      }

      // Get all tags from the repository with pagination
      const tags = await this.context.octokit.paginate(
        this.context.octokit.repos.listTags,
        {
          owner: this.repo.owner.login,
          repo: this.repo.name,
          per_page: 100
        }
      );
      this.logger.info(`Checking for non-alpha tags for version ${version}`);

      // Check if any tag matches the non-alpha pattern for the release branch version
      return await this.anyNonAlphaTagsForVersion(version, tags);
    } catch (error) {
      this.logger.info(`Error checking tags: ${JSON.stringify(error)}`);
      return false;
    }
  }

  async mergeForward(): Promise<void> {
    if (await this.pluginIsDisabled()) return;

    // Handle both old and new branching strategies
    if (this.isReleaseBranch(this.currentBranch)) {
      // New branching strategy (release/*)
      this.logger.info("Detected release branch in new branching strategy");

      // Check if the branch has a non-alpha tag (which means it's already been released)
      if (await this.hasNonAlphaTag()) {
        this.logger.info("Will not merge forward on branch with non-alpha tag (already released)");
        return;
      }

      // For release branches, the next branch is always 'main'
      const nextBranch = "main";
      await this.createAndMergeForwardPR(nextBranch);
    } else if (isVersionedBranch(this.currentBranch) || isVersionedUCXBranch(this.currentBranch)) {
      // Old branching strategy (branch-*)
      this.logger.info("Detected branch in old branching strategy");

      const branches = await this.getBranches();
      const sortedBranches = this.sortBranches(branches);
      const nextBranch = this.getNextBranch(sortedBranches);

      if (!nextBranch) {
        this.logger.info("No next branch found for forward merge");
        return;
      }

      await this.createAndMergeForwardPR(nextBranch);
    } else {
      this.logger.info("Will not merge forward on non-versioned and non-release branch");
      return;
    }
  }

  async createAndMergeForwardPR(nextBranch: string): Promise<void> {
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
      .filter((branch) => isVersionedBranch(branch.name) || isVersionedUCXBranch(branch.name))
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
