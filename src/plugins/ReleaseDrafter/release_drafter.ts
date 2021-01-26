import {
  PushContext,
  PayloadRepository,
  SearchIssuesAndPullRequestsResponseData,
} from "../../types";
import { basename } from "path";
import { resolve } from "path";
import { readFileSync } from "fs";
import nunjucks from "nunjucks";

export class ReleaseDrafter {
  context: PushContext;
  branchName: string;
  repo: PayloadRepository;

  constructor(context: PushContext) {
    this.context = context;
    this.branchName = basename(context.payload.ref);
    this.repo = context.payload.repository;
  }

  async draftRelease(): Promise<any> {
    const { context, branchName, repo } = this;
    const { created, deleted } = context.payload;
    console.log(
      `Drafting release for branch '${branchName}' of '${repo.name}'.`
    );

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

    const branchVersionNumber: number = parseInt(branchName.split(".")[1]);
    const releaseName = `v0.${branchVersionNumber}.0`;
    const prs = await this.getPRsFromBranch();
    const releaseDraftBody = this.getReleaseDraftBody(prs, releaseName);
    const releaseId = await this.getExistingDraftReleaseId(releaseName);
    await this.createOrUpdateDraftRelease(
      releaseId,
      releaseName,
      releaseDraftBody
    );

    console.log(
      `Release notes for branch '${branchName}' of '${repo.name}' published.`
    );
  }

  /**
   * Returns true if the branch name matches the "branch-0.xx" pattern
   */
  isVersionedBranch(): boolean {
    const re = /^branch-0.{1,3}\d/;
    return Boolean(this.branchName.match(re));
  }

  /**
   * Returns all non-forward-merger PRs that have been merged into
   * the repo's base branch.
   */
  async getPRsFromBranch(): Promise<
    SearchIssuesAndPullRequestsResponseData["items"]
  > {
    const { context, repo, branchName } = this;

    const prs = await context.octokit.paginate(
      context.octokit.search.issuesAndPullRequests,
      {
        q: `repo:${repo.full_name} base:${branchName} is:pr is:merged`,
        per_page: 100,
      }
    );
    return prs.filter(
      (pr) => !pr.title.toLowerCase().startsWith("[gpuci] auto-merge branch-")
    );
  }

  /**
   * Returns the body string for the release draft
   * @param prs
   * @param releaseTitle
   */
  getReleaseDraftBody(
    prs: SearchIssuesAndPullRequestsResponseData["items"],
    releaseTitle: string
  ): string {
    const categories = {
      bug: { title: "Bug Fixes", prs: [] },
      doc: { title: "Documentation", prs: [] },
      "feature request": { title: "New Features", prs: [] },
      improvement: { title: "Improvements", prs: [] },
    };

    const breakingPRs: SearchIssuesAndPullRequestsResponseData["items"] = [];

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
   * Returns the ID of an existing draft release whose name is releaseName.
   * otherwise returns an empty string.
   * @param context
   * @param releaseName
   */
  async getExistingDraftReleaseId(releaseName: string): Promise<number> {
    const { context, repo } = this;
    const { data: releases } = await context.octokit.repos.listReleases({
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 20,
    });
    const existingDraftRelease = releases.find(
      (release) => release.name === releaseName && release.draft === true
    );

    if (existingDraftRelease) {
      return existingDraftRelease.id;
    }
    return -1;
  }

  async createOrUpdateDraftRelease(
    releaseId: number,
    releaseName: string,
    releaseBody: string
  ) {
    const { context, repo } = this;
    const owner = repo.owner.login;
    const repo_name = repo.name;

    if (releaseId !== -1) {
      await context.octokit.repos.updateRelease({
        owner,
        repo: repo_name,
        release_id: releaseId,
        body: releaseBody,
      });
      return;
    }

    await context.octokit.repos.createRelease({
      owner,
      repo: repo_name,
      tag_name: releaseName,
      name: releaseName,
      draft: true,
      body: releaseBody,
    });
  }
}
