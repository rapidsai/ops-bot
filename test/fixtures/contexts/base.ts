import {
  mockCreateCommitStatus,
  mockCreateRelease,
  mockGetByUsername,
  mockGetUserPermissionLevel,
  mockListComments,
  mockListCommits,
  mockListPullRequestsFromCommit,
  mockListReleases,
  mockListReviews,
  mockMerge,
  mockPaginate,
  mockPullsGet,
  mockSearchIssues,
  mockUpdateRelease,
} from "../../mocks";
import type { WebhookEvents } from "@octokit/webhooks";

export const makeContext = (payload, name: WebhookEvents) => {
  return {
    name,
    payload,
    octokit: {
      issues: {
        listComments: mockListComments,
      },
      pulls: {
        get: mockPullsGet,
        listReviews: mockListReviews,
        merge: mockMerge,
      },
      repos: {
        createCommitStatus: mockCreateCommitStatus,
        createRelease: mockCreateRelease,
        getCollaboratorPermissionLevel: mockGetUserPermissionLevel,
        listCommits: mockListCommits,
        listPullRequestsAssociatedWithCommit: mockListPullRequestsFromCommit,
        listReleases: mockListReleases,
        updateRelease: mockUpdateRelease,
      },
      users: {
        getByUsername: mockGetByUsername,
      },
      search: {
        issuesAndPullRequests: mockSearchIssues,
      },
      paginate: mockPaginate,
    },
  };
};
