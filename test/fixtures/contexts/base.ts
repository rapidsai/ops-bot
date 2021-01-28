import {
  mockCreateCommitStatus,
  mockCreateRelease,
  mockGetByUsername,
  mockGetReleaseByTag,
  mockGetUserPermissionLevel,
  mockListComments,
  mockListCommits,
  mockListPullRequestsFromCommit,
  mockListPulls,
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
      git: {
        updateRef: mockUpdateRef,
      },
      issues: {
        listComments: mockListComments,
      },
      pulls: {
        get: mockPullsGet,
        list: mockListPulls,
        listReviews: mockListReviews,
        merge: mockMerge,
      },
      repos: {
        createCommitStatus: mockCreateCommitStatus,
        createRelease: mockCreateRelease,
        getCollaboratorPermissionLevel: mockGetUserPermissionLevel,
        listCommits: mockListCommits,
        listPullRequestsAssociatedWithCommit: mockListPullRequestsFromCommit,
        getReleaseByTag: mockGetReleaseByTag,
        updateRelease: mockUpdateRelease,
      },
      users: {
        getByUsername: mockGetByUsername,
      },
      paginate: mockPaginate,
    },
  };
};
