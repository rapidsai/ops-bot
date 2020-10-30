import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import {
  PullsGetResponseData,
  IssuesListEventsForTimelineResponseData,
  UsersGetByUsernameResponseData,
} from "@octokit/types";
import { createAppAuth } from "@octokit/auth-app";
import strip from "strip-comments";

const MyOctokit = Octokit.plugin(throttling).defaults({
  per_page: 100,
});

// const privateKey = process.env.PRIVATE_KEY as string;

interface Author {
  name: string;
  email: string;
}

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
  const repositories = await client.paginate(
    client.apps.listReposAccessibleToInstallation
  );

  // Iterate over repos
  for (let i = 0; i < repositories.length; i++) {
    const repo = repositories[i];
    console.log(`starting repo - ${repo.full_name}`);

    // Query PRs with merge label
    const queryResults = await client.paginate(
      client.search.issuesAndPullRequests,
      {
        q: `repo:${repo.full_name} is:pr is:open label:"${mergeLabel}"`,
      }
    );

    // Iterate over & merge PRs
    for (let j = 0; j < queryResults.length; j++) {
      const result = queryResults[j];

      // Get full PR info
      const { data: pr } = await client.pulls.get({
        owner: org,
        repo: repo.name,
        pull_number: result.number,
      });

      console.log(`starting PR #${pr.number} - ${pr.title}`);
      if (!(await isPrMergeable(pr))) {
        console.log(
          `PR #${pr.number} has conflicts or pending CI checks. Skipping...`
        );
        continue;
      }

      const events = await client.paginate(
        client.issues.listEventsForTimeline,
        {
          owner: org,
          repo: pr.base.repo.name,
          issue_number: pr.number,
        }
      );

      if (!(await hasValidMergeLabelActor(pr, events))) {
        console.log(
          `PR #${pr.number} has an invalid merge label actor. Skipping...`
        );
        continue;
      }

      // Merge PR

      const commitMessage = await createCommitMessage(pr, events);
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
    }
  }
  console.log("done!");
};

if (require.main === module) {
  mergePRs();
}
