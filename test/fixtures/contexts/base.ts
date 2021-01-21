import {
  mockCompareCommits,
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
  mockUpdateRef,
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
        compareCommits: mockCompareCommits,
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
      git: {
        updateRef: mockUpdateRef,
      },
      paginate: mockPaginate,
    },
  };
};
