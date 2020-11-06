import {
  PullsGetResponseData,
  IssuesListEventsForTimelineResponseData,
} from "@octokit/types";
import { getClient } from "./client";
import {
  AppsListReposResponseRepositories,
  SearchIssuesAndPullRequestsResponseItems,
} from "./types";
import {
  createCommitMessage,
  hasValidMergeLabelActor,
  isPrMergeable,
  sanitizePrTitle,
} from "./utils";

export const MERGE_LABEL = "okay to merge";
export const ORG = "rapidsai";

export const mergePRs = async () => {
  const client = getClient();

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
          q: `repo:${repo.full_name} is:pr is:open label:"${MERGE_LABEL}"`,
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
          owner: ORG,
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
          `${iterationDescription} has merge conflicts, pending CI checks or is merging to "main" branch. Skipping...`
        );
        continue;
      }

      let events: IssuesListEventsForTimelineResponseData;
      try {
        events = await client.paginate(client.issues.listEventsForTimeline, {
          owner: ORG,
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
        mergeLabelActorIsValid = await hasValidMergeLabelActor(
          client,
          pr,
          events
        );
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
        commitMessage = await createCommitMessage(client, pr, events);
      } catch (error) {
        console.error(
          `Error creating commit message for ${iterationDescription}. Skipping...`
        );
        continue;
      }

      const commitTitle = sanitizePrTitle(pr.title) + `(#${pr.number})`;
      console.log(`Merging ${iterationDescription}`);

      try {
        await client.pulls.merge({
          owner: ORG,
          repo: pr.base.repo.name,
          pull_number: pr.number,
          merge_method: "squash",
          commit_title: commitTitle,
          commit_message: commitMessage,
        });
      } catch (error) {
        console.error(error);
        console.warn(`Error merging ${iterationDescription}. Continuing...`);
        continue;
      }
    }

    if (!queryResults.length) {
      console.log(`No PRs w/ merge label found in repo: ${repo.full_name}`);
    }
  }
  console.log("Done!");
};

if (require.main === module) {
  mergePRs();
}
