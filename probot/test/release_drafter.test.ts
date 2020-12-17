import { ReleaseDrafter } from "../src/plugins/ReleaseDrafter/release_drafter";
import * as context from "./fixtures/contexts/push";
import * as compareCommitsResp from "./fixtures/responses/compare_commits.json";
import * as listCommitsResp from "./fixtures/responses/list_commits.json";
import {
  commitPRs,
  commitPRsNoLabels,
} from "./fixtures/responses/list_pull_requests_associated_with_commit";
import { hasExistingRelease } from "./fixtures/responses/list_releases";
import {
  mockCompareCommits,
  mockListCommits,
  mockListPullRequestsFromCommit,
  mockListReleases,
  mockUpdateRelease,
  mockCreateRelease,
} from "./mocks";

describe("Label Check", () => {
  beforeEach(() => {
    mockCompareCommits.mockReset();
    mockCreateRelease.mockReset();
    mockListCommits.mockReset();
    mockListPullRequestsFromCommit.mockReset();
    mockListReleases.mockReset();
    mockUpdateRelease.mockReset();
  });

  test("doesn't run on non-versioned branches", async () => {
    await new ReleaseDrafter(context.nonVersionedBranch).draftRelease();
    expect(mockCompareCommits).not.toHaveBeenCalled();
    expect(mockListCommits).not.toHaveBeenCalled();
    expect(mockListPullRequestsFromCommit).not.toHaveBeenCalled();
    expect(mockListReleases).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on created/deleted pushes", async () => {
    await new ReleaseDrafter(context.createdPush).draftRelease();
    await new ReleaseDrafter(context.deletedPush).draftRelease();
    expect(mockCompareCommits).not.toHaveBeenCalled();
    expect(mockListCommits).not.toHaveBeenCalled();
    expect(mockListPullRequestsFromCommit).not.toHaveBeenCalled();
    expect(mockListReleases).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("update existing release", async () => {
    mockCompareCommits.mockResolvedValueOnce(compareCommitsResp);
    mockListCommits.mockResolvedValueOnce(listCommitsResp);
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRs[0]);
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRs[1]);
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRs[1]);
    mockListPullRequestsFromCommit.mockResolvedValueOnce(commitPRsNoLabels);
    mockListPullRequestsFromCommit.mockResolvedValueOnce({
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
