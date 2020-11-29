import {
  mockCompareCommits,
  mockCreateCommitStatus,
  mockCreateRelease,
  mockListCommits,
  mockListPullRequestsAssociatedWithCommit,
  mockListReleases,
  mockUpdateRelease,
} from "../../mocks";

export const makeContext = (payload) => {
  return {
    payload,
    octokit: {
      repos: {
        compareCommits: mockCompareCommits,
        createCommitStatus: mockCreateCommitStatus,
        createRelease: mockCreateRelease,
        listCommits: mockListCommits,
        listPullRequestsAssociatedWithCommit: mockListPullRequestsAssociatedWithCommit,
        listReleases: mockListReleases,
        updateRelease: mockUpdateRelease,
      },
    },
  };
};

// Probot plugins usage
// context.payload
// context.payload.ref
// context.payload.repository.name
// context.payload.after
// context.payload.repository.owner.login
// context.payload.pull_request.labels
// context.payload.pull_request.head.sha
