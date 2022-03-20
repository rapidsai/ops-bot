import {
  mockConfigGet,
  mockContextRepo,
  mockCreateComment,
  mockCreateCommitStatus,
  mockCreateRef,
  mockCreateRelease,
  mockDeleteRef,
  mockGetByUsername,
  mockCheckMembershipForUser,
  mockGetRef,
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
import type { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types";

export const makeContext = (payload, name: EmitterWebhookEventName) => {
  return {
    name,
    payload,
    repo: mockContextRepo,
    octokit: {
      issues: {
        listComments: mockListComments,
        createComment: mockCreateComment
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
      config: {
        get: mockConfigGet,
      },
      orgs: {
        checkMembershipForUser: mockCheckMembershipForUser
      },
      rest: {
        git: {
          updateRef: mockUpdateRef,
          getRef: mockGetRef,
          deleteRef: mockDeleteRef,
          createRef: mockCreateRef
        }
      }
    },
  };
};
