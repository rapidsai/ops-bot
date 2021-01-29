import { ReleaseDrafter } from "../src/plugins/ReleaseDrafter/release_drafter";
import * as context from "./fixtures/contexts/push";
import { default as listPullsResp } from "./fixtures/responses/list_pulls.json";
import { default as getReleaseByTagResp } from "./fixtures/responses/get_release_by_tag.json";
import {
  mockGetReleaseByTag,
  mockUpdateRelease,
  mockCreateRelease,
  mockPaginate,
  mockListPulls,
  mockUpdateRef,
} from "./mocks";

describe("Release Drafter", () => {
  beforeEach(() => {
    mockCreateRelease.mockReset();
    mockGetReleaseByTag.mockReset();
    mockUpdateRelease.mockReset();
    mockPaginate.mockReset();
    mockListPulls.mockReset();
    mockUpdateRef.mockReset();
  });

  test("doesn't run on non-versioned branches", async () => {
    await new ReleaseDrafter(context.nonVersionedBranch).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on invalid version branches", async () => {
    await new ReleaseDrafter(context.invalidVersionedBranch).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("doesn't run on created/deleted pushes", async () => {
    await new ReleaseDrafter(context.createdPush).draftRelease();
    await new ReleaseDrafter(context.deletedPush).draftRelease();
    expect(mockPaginate).not.toHaveBeenCalled();
    expect(mockGetReleaseByTag).not.toHaveBeenCalled();
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease).not.toHaveBeenCalled();
  });

  test("update existing release", async () => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockResolvedValueOnce(getReleaseByTagResp);
    await new ReleaseDrafter(context.validBranch).draftRelease();
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(mockUpdateRelease.mock.calls[0][0].release_id).toBe(1);
    expect(mockUpdateRelease.mock.calls[0][0].body).toBe(
      `# [NIGHTLY] v0.17.0

## Bug Fixes

- Some PR title (#1234) @octokit

## Documentation

- Some Doc PR (#456) @ajschmidt8


## Breaking Changes

- Some PR title (#1234) @octokit`
    );
    expect(mockUpdateRef.mock.calls[0][0].ref).toBe("tags/branch-0.17-latest");
    expect(mockUpdateRef.mock.calls[0][0].sha).toBe("c48f35a");
  });

  test("create new release", async () => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockRejectedValueOnce("");
    await new ReleaseDrafter(context.validBranch).draftRelease();
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease.mock.calls[0][0].body).toBe(
      `# [NIGHTLY] v0.17.0

## Bug Fixes

- Some PR title (#1234) @octokit

## Documentation

- Some Doc PR (#456) @ajschmidt8


## Breaking Changes

- Some PR title (#1234) @octokit`
    );
    expect(mockUpdateRef).not.toHaveBeenCalled();
  });
});
