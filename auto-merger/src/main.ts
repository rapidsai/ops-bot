import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import {
  PullsGetResponseData,
  IssuesListEventsForTimelineResponseData,
  UsersGetByUsernameResponseData,
  Endpoints,
} from "@octokit/types";
import { createAppAuth } from "@octokit/auth-app";
import strip from "strip-comments";

const MyOctokit = Octokit.plugin(throttling).defaults({
  per_page: 100,
});

const privateKey = process.env.PRIVATE_KEY as string;

interface Author {
  name: string;
  email: string;
}
type AppsListReposResponseRepositories = Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"];
type SearchIssuesAndPullRequestsResponseItems = Endpoints["GET /search/issues"]["response"]["data"]["items"];

// const mergeLabel = "okay to merge";
const mergeLabel = "doc";
const org = "rapidsai";

const buff = Buffer.from(privateKey, "base64");

const client = new MyOctokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 85914,
    privateKey: buff.toString("ascii"),
    installationId: 12543261,
  },
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );
      octokit.log.info(`Retrying after ${retryAfter} seconds!`);
      return true;
    },
    onAbuseLimit: (retryAfter, options, octokit) => {
      // does not retry, only logs a warning
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
      octokit.log.info(`Retrying after ${retryAfter} seconds!`);
      return true;
    },
  },
});

/**
 * Returns true if PR's checks are all passing and it is being
 * merged into the default branch.
 *
 * @param pr
 */
const isPrMergeable = (pr: PullsGetResponseData): boolean =>
  pr.mergeable_state === "clean" &&
  pr.mergeable === true &&
  pr.base.ref === pr.base.repo.default_branch;

/**
 * Determines if user who added merge label has permissions to merge
 *
 * @param pr
 * @param events
 */
const hasValidMergeLabelActor = async (
  pr: PullsGetResponseData,
  events: IssuesListEventsForTimelineResponseData
): Promise<boolean> => {
  const repoName = pr.base.repo.name;

  const mergeUsers = (
    await client.paginate(client.teams.listMembersInOrg, {
      org,
      team_slug: `${repoName}-write`,
    })
  ).map((el) => el.login);

  const mergeLabelActor = events
    .filter((el: any) => el.event === "labeled" && el.label.name === mergeLabel)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0].actor
    .login;

  return mergeUsers.includes(mergeLabelActor);
};

// Drop [] brackets from PR title
const sanitizePrTitle = (rawTitle) => {
  return rawTitle.replace(/\[[\s\S]*?\]/g, "").trim();
};

const getUniqueAuthors = (
  events: IssuesListEventsForTimelineResponseData
): Author[] => {
  return events
    .filter((el) => el.event === "committed")
    .reduce((acc: any, cur: any) => {
      const author = {
        name: cur.author.name,
        email: cur.author.email,
      };
      const alreadyInArray =
        acc.findIndex((el) => JSON.stringify(author) === JSON.stringify(el)) !==
        -1;

      if (alreadyInArray) return acc;
      return [...acc, author];
    }, []);
};

const getApproverProfiles = async (
  pr: PullsGetResponseData
): Promise<UsersGetByUsernameResponseData[]> => {
  const reviewers = await client.paginate(client.pulls.listReviews, {
    owner: org,
    repo: pr.base.repo.name,
    pull_number: pr.number,
  });
  const approvers = reviewers.filter((review) => review.state === "APPROVED");

  return Promise.all(
    approvers.map(
      async (approver) =>
        (
          await client.users.getByUsername({
            username: approver.user.login,
          })
        ).data
    )
  );
};

const createCommitMessage = async (
  pr: PullsGetResponseData,
  events: IssuesListEventsForTimelineResponseData
): Promise<string> => {
  let commitMsg = "";

  const prBody = strip(pr.body, {
    language: "html",
    preserveNewlines: false,
  }).trim();
  const authors = getUniqueAuthors(events);

  const approvers = await getApproverProfiles(pr);

  commitMsg += `${prBody}\n`;

  commitMsg += "Authors:\n";
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    commitMsg += `  - ${author.name} <${author.email}>\n`;
  }
  commitMsg += "Approvers:\n";
  for (let j = 0; j < approvers.length; j++) {
    const approver = approvers[j];
    commitMsg += `  - ${approver.name}\n`;
  }
  commitMsg += `URL: ${pr.html_url}`;

  return commitMsg;
};

export const mergePRs = async () => {
  // Get repos with app installed
  let repositories: AppsListReposResponseRepositories;
  try {
    repositories = await client.paginate(
      client.apps.listReposAccessibleToInstallation
    );
  } catch (error) {
    throw new Error("Error getting app repos...");
  }

  // Iterate over repos
  for (let i = 0; i < repositories.length; i++) {
    const repo = repositories[i];
    console.log(`Starting repo - ${repo.full_name}`);

    // Query PRs with merge label
    let queryResults: SearchIssuesAndPullRequestsResponseItems;
    try {
      queryResults = await client.paginate(
        client.search.issuesAndPullRequests,
        {
          q: `repo:${repo.full_name} is:pr is:open label:"${mergeLabel}"`,
        }
      );
    } catch (error) {
      console.error(
        `Error searching for issues and pull requests in ${repo.full_name}. Skipping to next repo...`
      );
      continue;
    }

    // Iterate over & merge PRs
    for (let j = 0; j < queryResults.length; j++) {
      const result = queryResults[j];
      const iterationDescription = `${repo.full_name} #${result.number} - "${result.title}"`;

      // Get full PR info
      let pr: PullsGetResponseData;
      try {
        const { data } = await client.pulls.get({
          owner: org,
          repo: repo.name,
          pull_number: result.number,
        });
        pr = data;
      } catch (error) {
        console.error(
          `Error getting full PR info for ${iterationDescription}. Skipping...`
        );
        continue;
      }

      console.log(`Starting ${iterationDescription}`);
      if (!isPrMergeable(pr)) {
        console.log(
          `${iterationDescription} has conflicts or pending CI checks. Skipping...`
        );
        continue;
      }

      let events: IssuesListEventsForTimelineResponseData;
      try {
        events = await client.paginate(client.issues.listEventsForTimeline, {
          owner: org,
          repo: pr.base.repo.name,
          issue_number: pr.number,
        });
      } catch (error) {
        console.error(
          `Error getting events for ${iterationDescription}. Skipping...`
        );
        continue;
      }

      let mergeLabelActorIsValid: boolean;
      try {
        mergeLabelActorIsValid = await hasValidMergeLabelActor(pr, events);
      } catch (error) {
        console.error(
          `Error getting merge label actor for ${iterationDescription}. Skipping...`
        );
        continue;
      }

      if (!mergeLabelActorIsValid) {
        console.log(
          `${iterationDescription} has an invalid merge label actor. Skipping...`
        );
        continue;
      }

      // Merge PR

      let commitMessage: string;
      try {
        commitMessage = await createCommitMessage(pr, events);
      } catch (error) {
        console.error(
          `Error creating commit message for ${iterationDescription}. Skipping...`
        );
        continue;
      }

      const commitTitle = sanitizePrTitle(pr.title);
      console.log(`Merging PR#${pr.number} - ${pr.title}`);
      console.log(`commit title - ${commitTitle}`);
      console.log(`commit message - ${commitMessage}`);

      // await client.pulls.merge({
      //   owner: org,
      //   repo: pr.base.repo.name,
      //   pull_number: pr.number,
      //   merge_method: "squash",
      //   commit_title: commitTitle,
      //   commit_message: commitMessage,
      // });
      // SHA
      // v0.17
    }
  }
  console.log("Done!");
};

if (require.main === module) {
  mergePRs();
}
