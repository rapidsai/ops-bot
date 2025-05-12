/*
 * Copyright (c) 2024, NVIDIA CORPORATION.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ForwardMerger } from "../src/plugins/ForwardMerger/forward_merger.ts";
import { makePushContext } from "./fixtures/contexts/push.ts";
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateComment,
  mockCreatePR,
  mockListBranches,
  mockMerge,
  mockPaginate,
} from "./mocks.ts";
import { default as repoResp } from "./fixtures/responses/context_repo.json"
import { makeConfigReponse } from "./fixtures/responses/get_config.ts";

describe("Forward Merger", () => {
  beforeEach(() => {
    mockCreatePR.mockReset();
    mockMerge.mockReset();
    mockListBranches.mockReset();
    mockPaginate.mockReset();
    mockCreateComment.mockReset();
    // Reset hasNonAlphaTag mock if it exists on the instance
    if (ForwardMerger.prototype.hasNonAlphaTag && jest.isMockFunction(ForwardMerger.prototype.hasNonAlphaTag)) {
      (ForwardMerger.prototype.hasNonAlphaTag as jest.Mock).mockClear();
    }
  });

  beforeAll(() => {
    mockContextRepo.mockReset();
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(
      makeConfigReponse({
        forward_merger: true,
      })
    );
  });

  test("mergeForward should not run on push to non-versioned branch", async () => {
    const context = makePushContext({
      ref: "refs/heads/unversioned",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const mockGetBranches = jest.fn().mockName("getBranches");
    forwardMerger.getBranches = mockGetBranches;
    await forwardMerger.mergeForward();

    expect(mockGetBranches).not.toBeCalled();
  });

  test("mergeForward should not run when plugin is disabled", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const mockGetBranches = jest.fn().mockName("getBranches");
    forwardMerger.getBranches = mockGetBranches;
    const mockPluginIsDisabled = jest
      .fn()
      .mockName("pluginIsDisabled")
      .mockResolvedValue(true);
    forwardMerger.pluginIsDisabled = mockPluginIsDisabled;
    await forwardMerger.mergeForward();

    expect(mockPluginIsDisabled).toBeCalled();
    expect(mockGetBranches).not.toBeCalled();
  });

  test("mergeForward should not open PR on invalid next branch", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest
      .fn()
      .mockName("getBranches")
      .mockResolvedValue(null);
    forwardMerger.sortBranches = jest
      .fn()
      .mockName("sortBranches")
      .mockReturnValue(null);
    const nextBranch = undefined;
    const mockGetNextBranch = jest
      .fn()
      .mockName("getNextBranch")
      .mockReturnValue(nextBranch);
    forwardMerger.getNextBranch = mockGetNextBranch;

    await forwardMerger.mergeForward();

    expect(mockCreatePR).not.toBeCalled();
  });

  test("should comment success on PR if merge is successful", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest
      .fn()
      .mockName("getBranches")
      .mockResolvedValue(null);
    forwardMerger.sortBranches = jest
      .fn()
      .mockName("sortBranches")
      .mockReturnValue(null);
    const nextBranch = {
      name: "branch-21.10",
    };
    forwardMerger.getNextBranch = jest
      .fn()
      .mockName("getNextBranch")
      .mockResolvedValue(nextBranch);
    const pr = { data: { number: 1, head: { sha: 123456 } } };
    mockCreatePR.mockResolvedValue(pr);

    mockMerge.mockResolvedValue(true);
    const mockNewClient = jest.fn().mockName("initNewClient");
    mockNewClient.mockReturnValue({ pulls: { merge: mockMerge } });
    forwardMerger.initNewClient = mockNewClient;
    const mockIssueComment = jest
      .fn()
      .mockName("issueComment")
      .mockResolvedValue(null);
    forwardMerger.issueComment = mockIssueComment;

    await forwardMerger.mergeForward();

    expect(mockIssueComment).toBeCalledWith(
      pr.data.number,
      "**SUCCESS** - forward-merge complete."
    );
  });

  test("should comment failure on PR if merge is unsuccessful", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest
      .fn()
      .mockName("getBranches")
      .mockResolvedValue(null);
    forwardMerger.sortBranches = jest
      .fn()
      .mockName("sortBranches")
      .mockResolvedValue(null);
    const nextBranch = {
      name: "branch-21.10",
    };
    forwardMerger.getNextBranch = jest
      .fn()
      .mockName("getNextBranch")
      .mockReturnValue(nextBranch);
    const pr = { data: { number: 1, head: { sha: 123456 } } };
    mockCreatePR.mockResolvedValue(pr);

    mockMerge.mockRejectedValueOnce(new Error("error"));
    const mockNewClient = jest.fn().mockName("initNewClient");
    mockNewClient.mockReturnValue({ pulls: { merge: mockMerge } });
    forwardMerger.initNewClient = mockNewClient;
    const mockIssueComment = jest
      .fn()
      .mockName("issueComment")
      .mockResolvedValue(null);
    forwardMerger.issueComment = mockIssueComment;

    await forwardMerger.mergeForward();

    expect(mockIssueComment).toBeCalledWith(
      pr.data.number,
      "**FAILURE** - Unable to forward-merge due to an error, **manual** merge is necessary. Do not use the `Resolve conflicts` option in this PR, follow these instructions https://docs.rapids.ai/maintainers/forward-merger/ \n\n**IMPORTANT**: When merging this PR, do not use the [auto-merger](https://docs.rapids.ai/resources/auto-merger/) (i.e. the `/merge` comment). Instead, an admin must manually merge by changing the merging strategy to `Create a Merge Commit`. Otherwise, history will be lost and the branches become incompatible."
    );
  });

  test("mergeForward should obtain the correct next branch from a given list of unsorted branches", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = [
      "branch-22.04",
      "branch-21.12",
      "branch-21.10",
      "branch-22.02",
    ];
    const mockGetBranches = jest
      .fn()
      .mockName("getBranches")
      .mockResolvedValue(branches);
    mockCreatePR.mockResolvedValue({ data: {} });
    forwardMerger.getBranches = mockGetBranches;
    await forwardMerger.mergeForward();

    expect(mockCreatePR.mock.calls[0][0].base).toBe("branch-22.04");
  });

  test("getBranches should return versioned branches", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = [
      {
        name: "branch-21.12",
      },
      {
        name: "non-versioned",
      },
      {
        name: "branch-21.10",
      },
    ];
    mockPaginate.mockResolvedValue(branches);
    mockListBranches.mockResolvedValue("something");

    const result = await forwardMerger.getBranches();

    expect(result.length).toEqual(2);
    expect(result[0]).toEqual("branch-21.12");
    expect(result[1]).toEqual("branch-21.10");
    expect(mockPaginate.mock.calls[0][0]).toBe(mockListBranches);
    expect(mockPaginate.mock.calls[0][1]).toMatchObject({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
    });
  });

  test("sortBranches should sort branches", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = [
      "branch-0.10",
      "branch-21.12",
      "branch-21.10",
      "branch-19.10",
      "branch-22.02",
      "branch-0.9",
    ];

    const result = forwardMerger.sortBranches(branches);

    expect(result.length).toEqual(6);
    expect(result[0]).toEqual("branch-0.9");
    expect(result[1]).toEqual("branch-0.10");
    expect(result[2]).toEqual("branch-19.10");
    expect(result[3]).toEqual("branch-21.10");
    expect(result[4]).toEqual("branch-21.12");
    expect(result[5]).toEqual("branch-22.02");
  });

  test("getNextBranch should return next branch", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = ["branch-21.12", "branch-21.10", "branch-22.02"];
    const sortedBranches = forwardMerger.sortBranches(branches);
    const result = await forwardMerger.getNextBranch(sortedBranches);

    expect(result).toEqual("branch-22.02");
  });

  test("getNextBranch should return undefined if there is no next branch", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = ["branch-21.12", "branch-21.10", "branch-22.02"];
    const sortedBranches = forwardMerger.sortBranches(branches);
    const result = await forwardMerger.getNextBranch(sortedBranches);

    expect(result).toBeUndefined();
  });

  test("issueComment should create comment", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    mockCreateComment.mockResolvedValue(null);
    await forwardMerger.issueComment(1, "comment");

    expect(mockCreateComment.mock.calls[0][0]).toMatchObject({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: 1,
      body: "comment",
    });
  });

  describe("isNonAlphaReleaseTag", () => {
    let forwardMerger;

    beforeAll(() => {
      const context = makePushContext({ ref: "refs/heads/release/25.02" });
      forwardMerger = new ForwardMerger(context, context.payload);
    });

    test("should return true for valid non-alpha tag", () => {
      expect(forwardMerger.isNonAlphaReleaseTag("v25.02.00", "25.02")).toBe(true);
      expect(forwardMerger.isNonAlphaReleaseTag("v25.02.10", "25.02")).toBe(true);
    });

    test("should return false for alpha tag", () => {
      expect(forwardMerger.isNonAlphaReleaseTag("v25.02.00a1", "25.02")).toBe(false);
    });

    test("should return false for tag of different version", () => {
      expect(forwardMerger.isNonAlphaReleaseTag("v25.04.00", "25.02")).toBe(false);
    });

    test("should return false for incorrectly formatted tag", () => {
      expect(forwardMerger.isNonAlphaReleaseTag("v25.02", "25.02")).toBe(false);
      expect(forwardMerger.isNonAlphaReleaseTag("25.02.00", "25.02")).toBe(false);
      expect(forwardMerger.isNonAlphaReleaseTag("v25.02.00rc1", "25.02")).toBe(false);
    });

    test("should handle non-string input", () => {
      expect(forwardMerger.isNonAlphaReleaseTag(null, "25.02")).toBe(false);
      expect(forwardMerger.isNonAlphaReleaseTag(undefined, "25.02")).toBe(false);
      expect(forwardMerger.isNonAlphaReleaseTag(123, "25.02")).toBe(false);
    });
  });

  describe("anyNonAlphaTagsForVersion", () => {
    let forwardMerger;

    beforeAll(() => {
      const context = makePushContext({ ref: "refs/heads/release/25.02" });
      forwardMerger = new ForwardMerger(context, context.payload);
    });

    test("should return true if a non-alpha tag exists", async () => {
      const tags = [{ name: "v25.02.00" }, { name: "v25.02.00a1" }];
      await expect(forwardMerger.anyNonAlphaTagsForVersion("25.02", tags)).resolves.toBe(true);
    });

    test("should return false if only alpha tags exist", async () => {
      const tags = [{ name: "v25.02.00a1" }, { name: "v25.02.00rc1" }];
      await expect(forwardMerger.anyNonAlphaTagsForVersion("25.02", tags)).resolves.toBe(false);
    });

    test("should return false if only tags for other versions exist", async () => {
      const tags = [{ name: "v25.04.00" }, { name: "v24.12.01" }];
      await expect(forwardMerger.anyNonAlphaTagsForVersion("25.02", tags)).resolves.toBe(false);
    });

    test("should return false for empty tag list", async () => {
      const tags = [];
      await expect(forwardMerger.anyNonAlphaTagsForVersion("25.02", tags)).resolves.toBe(false);
    });
  });

  describe("hasNonAlphaTag", () => {
    let forwardMerger: ForwardMerger;
    const mockListTags = jest.fn();

    beforeEach(() => {
      mockPaginate.mockReset();
      mockListTags.mockReset();
      // Mock the paginate function to return mockListTags
      mockPaginate.mockImplementation(async (method, params) => {
        if (method === forwardMerger.context.octokit.repos.listTags) {
          return mockListTags(params);
        }
        return []; // Default empty array for other paginate calls
      });
    });

    test("should return true when a non-alpha tag exists for the release branch version", async () => {
      const context = makePushContext({ ref: "refs/heads/release/25.02" });
      forwardMerger = new ForwardMerger(context, context.payload);
      mockListTags.mockResolvedValue([{ name: "v25.02.00" }, { name: "v25.02.00a1" }]);

      const result = await forwardMerger.hasNonAlphaTag()
      expect(result).toBe(true);
      expect(mockPaginate).toHaveBeenCalledWith(forwardMerger.context.octokit.repos.listTags, expect.anything());
    });

    test("should return false when only alpha tags exist for the release branch version", async () => {
      const context = makePushContext({ ref: "refs/heads/release/25.04" });
      forwardMerger = new ForwardMerger(context, context.payload);
      mockListTags.mockResolvedValue([{ name: "v25.04.00a1" }, { name: "v25.04.00rc1" }]);

      await expect(forwardMerger.hasNonAlphaTag()).resolves.toBe(false);
      expect(mockPaginate).toHaveBeenCalledWith(forwardMerger.context.octokit.repos.listTags, expect.anything());
    });

    test("should return false when no tags exist for the release branch version", async () => {
      const context = makePushContext({ ref: "refs/heads/release/25.06" });
      forwardMerger = new ForwardMerger(context, context.payload);
      mockListTags.mockResolvedValue([{ name: "v25.04.00" }, { name: "v24.12.01" }]);

      await expect(forwardMerger.hasNonAlphaTag()).resolves.toBe(false);
    });

    test("should return false when the branch is not a release branch", async () => {
      const context = makePushContext({ ref: "refs/heads/branch-25.02" }); // Not a release branch
      forwardMerger = new ForwardMerger(context, context.payload);

      await expect(forwardMerger.hasNonAlphaTag()).resolves.toBe(false);
      expect(mockPaginate).not.toHaveBeenCalled();
    });

    test("should return false if listing tags fails", async () => {
      const context = makePushContext({ ref: "refs/heads/release/25.08" });
      forwardMerger = new ForwardMerger(context, context.payload);
      mockPaginate.mockRejectedValue(new Error("API Error"));

      await expect(forwardMerger.hasNonAlphaTag()).resolves.toBe(false);
    });
  });

  test("mergeForward should forward merge release branch to main if no non-alpha tag exists", async () => {
    const context = makePushContext({
      ref: "refs/heads/release/24.08",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    // Mock hasNonAlphaTag to return false (no non-alpha tag found)
    const mockHasNonAlphaTag = jest.fn().mockResolvedValue(false);
    forwardMerger.hasNonAlphaTag = mockHasNonAlphaTag;

    const pr = { data: { number: 1, head: { sha: 123456 } } };
    mockCreatePR.mockResolvedValue(pr);
    mockMerge.mockResolvedValue(true);
    const mockNewClient = jest.fn().mockName("initNewClient").mockReturnValue({ pulls: { merge: mockMerge } });
    forwardMerger.initNewClient = mockNewClient;
    const mockIssueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);
    forwardMerger.issueComment = mockIssueComment;

    await forwardMerger.mergeForward();

    expect(mockHasNonAlphaTag).toHaveBeenCalled();
    expect(mockCreatePR).toHaveBeenCalledWith(expect.objectContaining({
      base: "main", // Should merge to main
      head: "release/24.08",
      title: "Forward-merge release/24.08 into main",
    }));
    expect(mockMerge).toHaveBeenCalled();
    expect(mockIssueComment).toHaveBeenCalledWith(pr.data.number, "**SUCCESS** - forward-merge complete.");
  });

  test("mergeForward should NOT merge release branch if a non-alpha tag exists", async () => {
    const context = makePushContext({
      ref: "refs/heads/release/24.10",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    // Mock hasNonAlphaTag to return true (non-alpha tag found)
    const mockHasNonAlphaTag = jest.fn().mockResolvedValue(true);
    forwardMerger.hasNonAlphaTag = mockHasNonAlphaTag;

    await forwardMerger.mergeForward();

    expect(mockHasNonAlphaTag).toHaveBeenCalled();
    expect(mockCreatePR).not.toHaveBeenCalled();
    expect(mockMerge).not.toHaveBeenCalled();
  });

  // Keep existing tests for old branch strategy
  test("mergeForward should handle old branch strategy correctly", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02", // Old branch style
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = [
      "branch-22.04",
      "branch-21.12",
      "branch-21.10",
      "branch-22.02",
    ];
    const mockGetBranches = jest.fn().mockResolvedValue(branches);
    forwardMerger.getBranches = mockGetBranches; // Use instance mock
    mockCreatePR.mockResolvedValue({ data: { number: 1, head: { sha: 123456 } } });
    mockMerge.mockResolvedValue(true);
    const mockNewClient = jest.fn().mockName("initNewClient").mockReturnValue({ pulls: { merge: mockMerge } });
    forwardMerger.initNewClient = mockNewClient;
    const mockIssueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);
    forwardMerger.issueComment = mockIssueComment;

    // We don't need to mock hasNonAlphaTag here as it shouldn't be called for old branches

    await forwardMerger.mergeForward();

    expect(mockGetBranches).toHaveBeenCalled(); // Ensure old logic path was taken
    expect(mockCreatePR).toHaveBeenCalledWith(expect.objectContaining({
      base: "branch-22.04", // Correct next branch for old style
      head: "branch-22.02",
    }));
    expect(mockMerge).toHaveBeenCalled();
    expect(mockIssueComment).toHaveBeenCalledWith(1, "**SUCCESS** - forward-merge complete.");
  });
});
