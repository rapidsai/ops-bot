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

  constructor(context: PushContext) {
    this.context = context;
    this.branchName = basename(context.payload.ref);
    this.repo = context.payload.repository;
    this.releaseTagName = `${this.branchName}-latest`;
    this.branchVersionNumber = parseInt(this.branchName.split(".")[1]);
    this.releaseTitle = `[NIGHTLY] v0.${this.branchVersionNumber}.0`;
    this.mergeSHA = context.payload.after;
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
    if (!this.isVersionedBranch()) {
      console.warn(
        "Release drafts are only supported for 'branch-0.xx' branches."
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
   * Returns true if the branch name matches the "branch-0.xx" pattern
   */
  isVersionedBranch(): boolean {
    const re = /^branch-0.{1,3}\d$/;
    return Boolean(this.branchName.match(re));
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
    const { releaseTitle } = this;
    const categories = {
      bug: { title: "Bug Fixes", prs: [] },
      doc: { title: "Documentation", prs: [] },
      "feature request": { title: "New Features", prs: [] },
      improvement: { title: "Improvements", prs: [] },
    };

    const breakingPRs: PullsListResponseData = [];

    const labelInCategories = (el) => Object.keys(categories).includes(el.name);

    for (let i = 0; i < prs.length; i++) {
      const pr = prs[i];
      const categoryLabel = pr.labels.find(labelInCategories);
      if (!categoryLabel) {
        console.warn(
          `No category label found for PR ${pr.number} - ${pr.title}. Skipping changelog entry...`
        );
        continue;
      }
      const category = categoryLabel.name;
      categories[category].prs.push(pr);

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
        breaking: breakingPRs,
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
