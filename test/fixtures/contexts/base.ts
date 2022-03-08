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
  mockOrgMembership,
  mockPaginate,
  mockPullsGet,
  mockUpdateRelease,
} from "../../mocks";
import type { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types";

export const makeContext = (payload, name: EmitterWebhookEventName) => {
  return {
    name,
    payload,
    octokit: {
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
      orgs : {
        checkMembershipForUser: mockOrgMembership
      },
      paginate: mockPaginate,
    },
  };
};
