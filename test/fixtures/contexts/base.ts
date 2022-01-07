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
  mockTeamMembership,
  mockPaginate,
  mockPullsGet,
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
        checkMembershipForUser: mockOrgMembership,
      },
      teams: {
        getMembershipForUserInOrg: mockTeamMembership,
      },
      paginate: mockPaginate,
    },
  };
};
