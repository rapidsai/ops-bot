import { ReleaseDrafter } from "../src/plugins/ReleaseDrafter/release_drafter";
import * as context from "./fixtures/contexts/push";
import * as compareCommitsResp from "./fixtures/responses/compare_commits.json";
import * as listCommitsResp from "./fixtures/responses/list_commits.json";
import {
  validPRs,
  PRMissingLabels,
} from "./fixtures/responses/list_pull_requests_associated_with_commit";
import { hasExistingRelease } from "./fixtures/responses/list_releases";
import {
  mockCompareCommits,
  mockListCommits,
  mockListPullRequestsAssociatedWithCommit,
  mockListReleases,
  mockUpdateRelease,
  mockCreateRelease,
} from "./mocks";

describe("Label Check", () => {
  beforeEach(() => {
    mockCompareCommits.mockReset();
    mockCreateRelease.mockReset();
    mockListCommits.mockReset();
    mockListPullRequestsAssociatedWithCommit.mockReset();
    mockListReleases.mockReset();
    mockUpdateRelease.mockReset();
  });

  test("doesn't run on non-versioned branches", async () => {
    await new ReleaseDrafter(context.nonVersionedBranch).draftRelease();
    expect(mockCompareCommits).not.toHaveBeenCalled();
    expect(mockListCommits).not.toHaveBeenCalled();
    expect(mockListPullRequestsAssociatedWithCommit).not.toHaveBeenCalled();
    expect(mockListReleases).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on created/deleted pushes", async () => {
    await new ReleaseDrafter(context.createdPush).draftRelease();
    await new ReleaseDrafter(context.deletedPush).draftRelease();
    expect(mockCompareCommits).not.toHaveBeenCalled();
    expect(mockListCommits).not.toHaveBeenCalled();
    expect(mockListPullRequestsAssociatedWithCommit).not.toHaveBeenCalled();
    expect(mockListReleases).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("update existing release", async () => {
    mockCompareCommits.mockResolvedValueOnce(compareCommitsResp);
    mockListCommits.mockResolvedValueOnce(listCommitsResp);
    mockListPullRequestsAssociatedWithCommit.mockResolvedValueOnce(validPRs[0]);
    mockListPullRequestsAssociatedWithCommit.mockResolvedValueOnce(validPRs[1]);
    mockListPullRequestsAssociatedWithCommit.mockResolvedValueOnce(validPRs[1]);
    mockListPullRequestsAssociatedWithCommit.mockResolvedValueOnce(
      PRMissingLabels
    );
    mockListPullRequestsAssociatedWithCommit.mockResolvedValueOnce({
      data: [],
    });
    mockListReleases.mockResolvedValueOnce(hasExistingRelease);
    await new ReleaseDrafter(context.versionedBranch).draftRelease();
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(mockUpdateRelease.mock.calls[0][0].release_id).toBe(1);
    expect(mockUpdateRelease.mock.calls[0][0].body).toBe(
      `# v0.17.0 (Date TBD)

## Bug Fixes

- Some PR title (#1234) @octokit

## Documentation

- Some Doc PR (#456) @ajschmidt8


## Breaking Changes

- Some PR title (#1234) @octokit`
    );
  });
});
