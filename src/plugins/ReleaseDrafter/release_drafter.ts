import {
  PushContext,
  PayloadRepository,
  PullsListResponseData,
} from "../../types";
import { basename } from "path";
import { resolve } from "path";
import { readFileSync } from "fs";
import nunjucks from "nunjucks";

export class ReleaseDrafter {
  context: PushContext;
  branchName: string;
  repo: PayloadRepository;
  releaseTagName: string;
  branchVersionNumber: number;
  releaseTitle: string;
  mergeSHA: string;
  defaultBranch: string;

  constructor(context: PushContext) {
    this.context = context;
    this.branchName = basename(context.payload.ref);
    this.repo = context.payload.repository;
    this.releaseTagName = `${this.branchName}-latest`;
    this.branchVersionNumber = this.getVersionFromBranch(this.branchName);
    this.releaseTitle = `[NIGHTLY] v0.${this.branchVersionNumber}.0`;
    this.mergeSHA = context.payload.after;
    this.defaultBranch = this.repo.default_branch;
  }

  async draftRelease(): Promise<any> {
    const { context, branchName, repo } = this;
    const { created, deleted } = context.payload;

    // Don't run on branch created/delete pushes
    if (created || deleted) {
      const action = created ? "created" : "deleted";
      console.warn(`Release drafts not generated on action: ${action}`);
      return;
    }

    // Only run draft-releaser on release branches
    if (!this.isValidBranch()) {
      console.warn(
        "Release drafts are only supported for default or default+-1 versioned branches"
      );
      return;
    }

    console.log(`Drafting release for branch '${branchName}' of '${repo}'.`);

    const prs = await this.getPRsFromBranch();
    const releaseDraftBody = this.getReleaseDraftBody(prs);
    const releaseId = await this.getExistingDraftReleaseId();
    await this.createOrUpdateDraftRelease(releaseId, releaseDraftBody);

    console.log(
      `Release notes for branch '${branchName}' of '${repo.name}' published.`
    );
  }

  /**
   * Returns true if the branch name is valid. Valid branches should match
   * the branch-0.xx pattern and have a version that's the same as the repo's
   * default branch or default branch +- 1.
   */
  isValidBranch(): boolean {
    const re = /^branch-0.{1,3}\d$/;
    const isVersionedBranch = Boolean(this.branchName.match(re));
    if (!isVersionedBranch) return false;
    const { branchVersionNumber } = this;
    const defaultBranchVersionNumber = this.getVersionFromBranch(
      this.defaultBranch
    );

    return (
      defaultBranchVersionNumber === branchVersionNumber ||
      defaultBranchVersionNumber + 1 === branchVersionNumber ||
      defaultBranchVersionNumber - 1 === branchVersionNumber
    );
  }

  /**
   * Returns the RAPIDS version from a branch name, or
   * NaN if the branch name is not versioned.
   */
  getVersionFromBranch(branchName): number {
    return parseInt(branchName.split(".")[1]);
  }

  /**
   * Returns all non-forward-merger PRs that have been merged into
   * the repo's base branch.
   */
  async getPRsFromBranch(): Promise<PullsListResponseData> {
    const { context, repo, branchName } = this;

    const prs = await context.octokit.paginate(context.octokit.pulls.list, {
      owner: repo.owner.login,
      repo: repo.name,
      base: branchName,
      state: "closed",
      per_page: 100,
    });

    return prs
      .filter(
        (pr) => !pr.title.toLowerCase().startsWith("[gpuci] auto-merge branch-")
      )
      .filter((pr) => pr.merged_at); // merged_at === null for PRs that were closed, but not merged
  }

  /**
   * Returns the body string for the release draft
   * @param prs
   */
  getReleaseDraftBody(prs: PullsListResponseData): string {
    const { releaseTitle, branchVersionNumber } = this;
    const categories = {
      bug: { title: "Bug Fixes", prs: [] },
      doc: { title: "Documentation", prs: [] },
      "feature request": { title: "New Features", prs: [] },
      improvement: { title: "Improvements", prs: [] },
    };

    const breakingPRs: PullsListResponseData = [];

    const categoryFromLabels = (label) =>
      Object.keys(categories).includes(label.name);
    let hasEntries = false;
    for (let i = 0; i < prs.length; i++) {
      const pr = prs[i];
      const categoryLabel = pr.labels.find(categoryFromLabels);
      if (!categoryLabel) {
        console.warn(
          `No category label found for PR ${pr.number} - ${pr.title}. Skipping changelog entry...`
        );
        continue;
      }
      const category = categoryLabel.name;
      categories[category].prs.push(pr);
      hasEntries = true;

      if (pr.labels.find((el) => el.name === "breaking")) {
        breakingPRs.push(pr);
      }
    }

    const templatePath = resolve(__dirname, "draft_template.njk");
    const templateStr = readFileSync(templatePath, "utf-8");

    const nj = new nunjucks.Environment(null, {
      trimBlocks: true,
      lstripBlocks: true,
    });

    // Remove square brackets from title
    nj.addFilter("sanitizeTitle", (title) =>
      title.replace(/\[[\s\S]*?\]/g, "").trim()
    );

    return nj
      .renderString(templateStr, {
        categories,
        releaseTitle,
        hasEntries,
        breaking: breakingPRs,
        versionNumber: branchVersionNumber,
      })
      .trim();
  }

  /**
   * Returns the numerical ID of an existing prerelease whose tag is <releaseTagName>.
   * If no prerelease exists, returns -1.
   */
  async getExistingDraftReleaseId(): Promise<number> {
    const { context, repo, releaseTagName } = this;

    try {
      const { data: release } = await context.octokit.repos.getReleaseByTag({
        repo: repo.name,
        owner: repo.owner.login,
        tag: releaseTagName,
      });
      return release.id;
    } catch (error) {
      console.warn(`No existing release: ${repo.full_name} ${releaseTagName}`);
      return -1;
    }
  }

  /**
   * Creates a new release or updates an existing release and the associated
   * git tag.
   * @param releaseId
   * @param releaseBody
   */
  async createOrUpdateDraftRelease(releaseId: number, releaseBody: string) {
    const { context, releaseTitle, releaseTagName, mergeSHA, repo } = this;
    const owner = repo.owner.login;
    const repo_name = repo.name;

    if (releaseId !== -1) {
      await context.octokit.repos.updateRelease({
        owner,
        repo: repo_name,
        release_id: releaseId,
        body: releaseBody,
      });

      await context.octokit.git.updateRef({
        owner,
        repo: repo_name,
        sha: mergeSHA,
        ref: `tags/${releaseTagName}`,
      });
      return;
    }

    await context.octokit.repos.createRelease({
      owner,
      repo: repo_name,
      tag_name: releaseTagName,
      name: releaseTitle,
      prerelease: true,
      body: releaseBody,
      target_commitish: mergeSHA,
    });
  }
}
