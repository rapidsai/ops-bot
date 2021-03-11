import { ReleaseDrafter } from "../src/plugins/ReleaseDrafter/release_drafter";
import * as context from "./fixtures/contexts/push";
import { release_drafter as listPullsResp } from "./fixtures/responses/list_pulls.json";
import { default as getReleaseByTagResp } from "./fixtures/responses/get_release_by_tag.json";
import {
  mockGetReleaseByTag,
  mockUpdateRelease,
  mockCreateRelease,
  mockPaginate,
  mockListPulls,
} from "./mocks";

describe("Release Drafter", () => {
  beforeEach(() => {
    mockCreateRelease.mockReset();
    mockGetReleaseByTag.mockReset();
    mockUpdateRelease.mockReset();
    mockPaginate.mockReset();
    mockListPulls.mockReset();
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
    expect(mockGetReleaseByTag).toHaveBeenCalledTimes(1);
    expect(mockGetReleaseByTag.mock.calls[0][0].tag).toBe("v0.17.0a");
    expect(mockCreateRelease).not.toHaveBeenCalled();
    expect(mockUpdateRelease.mock.calls[0][0].release_id).toBe(1);
    expect(mockUpdateRelease.mock.calls[0][0].body).toBe(
      `\
## 🔗 Links

- [Development Branch](https://github.com/rapidsai/cudf/tree/branch-0.17)
- [Compare with \`main\` branch](https://github.com/rapidsai/cudf/compare/main...branch-0.17)

## 🚨 Breaking Changes

- Some PR title (#1234) @octokit

## 🐛 Bug Fixes

- Some PR title (#1234) @octokit

## 📖 Documentation

- Some Doc PR (#456) @ajschmidt8\
`
    );
  });

  test("create new release", async () => {
    mockPaginate.mockResolvedValueOnce(listPullsResp);
    mockGetReleaseByTag.mockRejectedValueOnce("");
    await new ReleaseDrafter(context.validBranch).draftRelease();
    expect(mockPaginate).toHaveBeenCalledTimes(1);
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListPulls);
    expect(mockGetReleaseByTag).toHaveBeenCalledTimes(1);
    expect(mockGetReleaseByTag.mock.calls[0][0].tag).toBe("v0.17.0a");
    expect(mockUpdateRelease).not.toHaveBeenCalled();
    expect(mockCreateRelease.mock.calls[0][0].body).toBe(
      `\
## 🔗 Links

- [Development Branch](https://github.com/rapidsai/cudf/tree/branch-0.17)
- [Compare with \`main\` branch](https://github.com/rapidsai/cudf/compare/main...branch-0.17)

## 🚨 Breaking Changes

- Some PR title (#1234) @octokit

## 🐛 Bug Fixes

- Some PR title (#1234) @octokit

## 📖 Documentation

- Some Doc PR (#456) @ajschmidt8\
`
    );
  });
});
