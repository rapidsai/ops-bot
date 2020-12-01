import { Octokit } from "@octokit/rest";
import {
  PullsGetResponseData,
  IssuesListEventsForTimelineResponseData,
  UsersGetByUsernameResponseData,
} from "@octokit/types";
import strip from "strip-comments";
import { MERGE_LABEL, ORG } from "./main";
import { Author } from "./types";

/**
 * Returns true if PR's checks are all passing and it is being
 * merged into the default branch.
 *
 * @param pr
 */
export const isPrMergeable = (pr: PullsGetResponseData): boolean =>
  pr.mergeable_state === "clean" &&
  pr.mergeable === true &&
  pr.base.ref !== "main";

/**
 * Determines if user who added merge label has permissions to merge
 *
 * @param pr
 * @param events
 */
export const hasValidMergeLabelActor = async (
  client: Octokit,
  pr: PullsGetResponseData,
  events: IssuesListEventsForTimelineResponseData
): Promise<boolean> => {
  const repoName = pr.base.repo.name;

  const mergeLabelActor = events
    .filter(
      (el: any) => el.event === "labeled" && el.label.name === MERGE_LABEL
    )
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0].actor
    .login;

  const { data: resp } = await client.repos.getCollaboratorPermissionLevel({
    owner: ORG,
    repo: repoName,
    username: mergeLabelActor,
  });

  return resp.permission === "admin" || resp.permission === "write";
};

/**
 * Drop square brackets, [], and their contents from a string
 * @param rawTitle
 */
export const sanitizePrTitle = (rawTitle): string => {
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
  client: Octokit,
  pr: PullsGetResponseData
): Promise<UsersGetByUsernameResponseData[]> => {
  const reviewers = await client.paginate(client.pulls.listReviews, {
    owner: ORG,
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

export const createCommitMessage = async (
  client: Octokit,
  pr: PullsGetResponseData,
  events: IssuesListEventsForTimelineResponseData
): Promise<string> => {
  let commitMsg = "";

  const prBody = strip(pr.body, {
    language: "html",
    preserveNewlines: false,
  }).trim();
  const authors = getUniqueAuthors(events);

  const approvers = await getApproverProfiles(client, pr);

  commitMsg += `${prBody}\n`;
  commitMsg += "\n";

  commitMsg += "Authors:\n";
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    commitMsg += `  - ${author.name} <${author.email}>\n`;
  }

  commitMsg += "\n";
  commitMsg += "Approvers:";
  if (approvers.length) commitMsg += "\n";
  if (!approvers.length) commitMsg += " None\n";
  for (let j = 0; j < approvers.length; j++) {
    const approver = approvers[j];
    commitMsg += `  - ${approver.name}\n`;
  }
  commitMsg += "\n";
  commitMsg += `URL: ${pr.html_url}`;

  return commitMsg;
};
