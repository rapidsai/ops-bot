import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import * as strip from "strip-comments";

const privateKey = process.env.PRIVATE_KEY as string;
type PullRequestData = RestEndpointMethodTypes["pulls"]["get"]["response"]["data"];

// const mergeLabel = "okay to merge";
const mergeLabel = "doc";
const org = "rapidsai";

const buff = Buffer.from(privateKey, "base64");

const client = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 85914,
    privateKey: buff.toString("ascii"),
    installationId: 12543261,
  },
});

const isPrMergeable = async (
  pr: PullRequestData,
  default_branch: string
): Promise<boolean> => {
  const repoName = pr.base.ref;

  // Checks if user who applied merge label has appropriate permissions
  // to merge.
  const mergeLabelActor = await getMergeLabelActor(pr);
  const mergeUsers = (
    await client.paginate(client.teams.listMembersInOrg, {
      org,
      team_slug: `${repoName}-write`,
      per_page: 100,
    })
  ).map((el) => el.login);

  return (
    pr.mergeable_state === "clean" &&
    pr.mergeable === true &&
    pr.base.ref === default_branch &&
    mergeUsers.includes(mergeLabelActor)
  );
};

// Determines the last user to add the merge label
const getMergeLabelActor = async (pr: PullRequestData): Promise<string> => {
  const events = await client.paginate(client.issues.listEventsForTimeline, {
    owner: org,
    repo: pr.base.repo.name,
    issue_number: pr.number,
    per_page: 100,
  });

  return events
    .filter((el: any) => el.event === "labeled" && el.label.name === mergeLabel)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0].actor
    .login;
};

export const mergePRs = async () => {
  console.log("inside async");
  // Get repos with app installed
  const { data } = await client.apps.listReposAccessibleToInstallation();
  const { repositories } = data;

  // Iterate over repos
  for (let i = 0; i < repositories.length; i++) {
    const repo = repositories[i];
    const { default_branch } = repo;

    // Query PRs with merge label
    const queryResults = await client.paginate(
      client.search.issuesAndPullRequests,
      {
        q: `repo:${repo.full_name} is:pr is:open label:"${mergeLabel}"`,
        per_page: 100,
      }
    );

    // Filter out PRs that shouldn't be merged
    const prs: PullRequestData[] = [];
    for (let j = 0; j < queryResults.length; j++) {
      const result = queryResults[j];

      // Get full PR info
      const { data: pr } = await client.pulls.get({
        owner: org,
        repo: repo.name,
        pull_number: result.number,
      });

      if (!(await isPrMergeable(pr, default_branch))) {
        continue;
      }

      prs.push(pr);
    }

    // Merge PRs
    for (let k = 0; k < prs.length; k++) {
      const pr = prs[k];

      // Get PR body w/out comments
      const prBody = strip(pr.body, {
        language: "html",
        preserveNewlines: false,
      });
      // Get approvers
      // Drop [] brackets from PR title
      // "hello, this is an example [skip-ci][skip-changelog]".replace(/\[[\s\S]*?\]/g, '');

      client.pulls.merge({
        owner: org,
        repo: pr.base.repo.name,
        pull_number: pr.number,
        merge_method: "squash",
      });
    }
  }
  console.log("after async");
};

if (require.main === module) {
  mergePRs();
}
