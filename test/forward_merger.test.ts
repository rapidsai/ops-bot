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

import { ForwardMerger } from "../src/plugins/ForwardMerger/forward_merger";
import { makePushContext } from "./fixtures/contexts/push";
import { mockConfigGet, mockContextRepo } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";

describe("Forward Merger", () => {
  beforeAll(() => {
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
  })

  test("mergeForward should not run when plugin is disabled", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const mockGetBranches = jest.fn().mockName("getBranches");
    forwardMerger.getBranches = mockGetBranches;
    const mockPluginIsDisabled = jest.fn().mockName("pluginIsDisabled").mockResolvedValue(true);
    forwardMerger.pluginIsDisabled = mockPluginIsDisabled;
    await forwardMerger.mergeForward();

    expect(mockPluginIsDisabled).toBeCalled();
    expect(mockGetBranches).not.toBeCalled();
  })

  test("mergeForward should sort branches", async () => {
  const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = [
      {
        name: "branch-21.12",
      },
      {
        name: "branch-21.10",
      }]
      // mock getBranches, sortBranches, and getNextBranch
      const mockGetBranches = jest.fn().mockName("getBranches").mockResolvedValue(branches);
      forwardMerger.getBranches = mockGetBranches;
      const sortedBranches = []
      const mockSortBranches = jest.fn().mockName("sortBranches").mockReturnValue(sortedBranches);
      forwardMerger.sortBranches = mockSortBranches;
      const mockGetNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(null);
      forwardMerger.getNextBranch = mockGetNextBranch;

      await forwardMerger.mergeForward();

      expect(mockGetBranches).toBeCalled();
      expect(mockSortBranches).toBeCalledWith(branches);
      expect(mockGetNextBranch).toBeCalledWith(sortedBranches);
  })

  test("mergeForward should open PR on valid next branch", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest.fn().mockName("getBranches").mockResolvedValue(null);
    forwardMerger.sortBranches = jest.fn().mockName("sortBranches").mockReturnValue(null);
    const nextBranch = "branch-21.10"
    const mockGetNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
    forwardMerger.getNextBranch = mockGetNextBranch;
    const mockCreatePR = jest.fn().mockName("openPR").mockResolvedValue({data: {}});
    forwardMerger.context.octokit.pulls.create = mockCreatePR as any;

    await forwardMerger.mergeForward();

    expect(mockCreatePR.mock.calls[0][0]).toMatchObject({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      title: "Forward-merge " + forwardMerger.currentBranch + " into " + nextBranch,
      head: forwardMerger.currentBranch,
      base: nextBranch,
      maintainer_can_modify: true,
      body: `Forward-merge triggered by push to ${forwardMerger.currentBranch} that creates a PR to keep ${nextBranch} up-to-date. If this PR is unable to be immediately merged due to conflicts, it will remain open for the team to manually merge. See [forward-merger docs](https://docs.rapids.ai/maintainers/forward-merger/) for more info.`,
    });
  }, 11000)

  test("mergeForward should not open PR on invalid next branch", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest.fn().mockName("getBranches").mockResolvedValue(null);
    forwardMerger.sortBranches = jest.fn().mockName("sortBranches").mockReturnValue(null);
    const nextBranch = null
    const mockGetNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
    forwardMerger.getNextBranch = mockGetNextBranch;
    const mockCreatePR = jest.fn().mockName("openPR").mockResolvedValue(null);
    forwardMerger.context.octokit.pulls.create = mockCreatePR as any;

    await forwardMerger.mergeForward();

    expect(mockCreatePR).not.toBeCalled();
  })

  test("mergeForward should merge PR after opening PR", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest.fn().mockName("getBranches").mockResolvedValue(null);
    forwardMerger.sortBranches = jest.fn().mockName("sortBranches").mockReturnValue(null);
    const nextBranch = {
      name: "branch-21.10",
    }
    forwardMerger.getNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
    const pr = {data: {number: 1, head: {sha: 123456}}}
    forwardMerger.context.octokit.pulls.create = <any>jest.fn().mockName("openPR").mockResolvedValue(pr);
    const mockMergePR = jest.fn().mockName("mergePR").mockResolvedValue({merged:true});
    forwardMerger.context.octokit.pulls.merge = <any>mockMergePR;
    forwardMerger.issueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);

    await forwardMerger.mergeForward();

    expect(mockMergePR.mock.calls[0][0]).toMatchObject({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      pull_number: pr.data.number,
      sha: pr.data.head.sha,
    });
  }, 11000)

  test("should not merge PR if there is no PR", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
      forwardMerger.getBranches = jest.fn().mockName("getBranches").mockResolvedValue(null);
      forwardMerger.sortBranches = jest.fn().mockName("sortBranches").mockReturnValue(null);
      const nextBranch = {
        name: "branch-21.10",
      }
      forwardMerger.getNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
      forwardMerger.context.octokit.pulls.create = <any>jest.fn().mockName("openPR").mockResolvedValue({data: {}});
      const mockMergePR = jest.fn().mockName("mergePR").mockResolvedValue(null);
      forwardMerger.context.octokit.pulls.merge = <any>mockMergePR;

      await forwardMerger.mergeForward();

      expect(mockMergePR).not.toBeCalled();
  }, 11000)

  test("should comment failure on PR if merge is successful", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
      forwardMerger.getBranches = jest.fn().mockName("getBranches").mockResolvedValue(null);
      forwardMerger.sortBranches = jest.fn().mockName("sortBranches").mockReturnValue(null);
      const nextBranch = {
        name: "branch-21.10",
      }
      forwardMerger.getNextBranch = jest.fn().mockName("getNextBranch").mockResolvedValue(nextBranch);
      const pr = {data: {number: 1, head: {sha: 123456}}}
      forwardMerger.context.octokit.pulls.create = <any>jest.fn().mockName("openPR").mockResolvedValue(pr);
      forwardMerger.context.octokit.pulls.merge = <any>jest.fn().mockName("mergePR").mockResolvedValue({merged: true});
      const mockIssueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);
      forwardMerger.issueComment = mockIssueComment;

      await forwardMerger.mergeForward();

      expect(mockIssueComment).toBeCalledWith(pr.data.number, "**SUCCESS** - forward-merge complete.");
  }, 11000)

  test("should comment failure on PR if merge is unsuccessful", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    forwardMerger.getBranches = jest.fn().mockName("getBranches").mockResolvedValue(null);
    forwardMerger.sortBranches = jest.fn().mockName("sortBranches").mockResolvedValue(null);
    const nextBranch = {
      name: "branch-21.10",
    }
    forwardMerger.getNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
    const pr = {data: {number: 1, head: {sha: 123456}}}
    forwardMerger.context.octokit.pulls.create = <any>jest.fn().mockName("openPR").mockResolvedValue(pr);
    const mockMergePR = jest.fn().mockName("mergePR").mockResolvedValue({merged: false});
    forwardMerger.context.octokit.pulls.merge = <any>mockMergePR;
    mockMergePR.mockRejectedValueOnce(new Error("error"));
    const mockIssueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);
    forwardMerger.issueComment = mockIssueComment;

    await forwardMerger.mergeForward();

    expect(mockIssueComment).toBeCalledWith(pr.data.number, "**FAILURE** - Unable to forward-merge due to an error, **manual** merge is necessary. Do not use the `Resolve conflicts` option in this PR, follow these instructions https://docs.rapids.ai/maintainers/forward-merger/ \n **IMPORTANT**: When merging this PR, do not use the [auto-merger](https://docs.rapids.ai/resources/auto-merger/) (i.e. the `/merge` comment). Instead, an admin must manually merge by changing the merging strategy to `Create a Merge Commit`. Otherwise, history will be lost and the branches become incompatible.");
  }, 11000)

  test("mergeForward should obtain the correct next branch from a given list of unsorted branches", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = ["branch-22.04", "branch-21.12", "branch-21.10", "branch-22.02"]
    const mockGetBranches = jest.fn().mockName("getBranches").mockResolvedValue(branches);
    const mockCreatePR = jest.fn().mockName("openPR").mockResolvedValue({data: {}})
    forwardMerger.getBranches = mockGetBranches
    forwardMerger.context.octokit.pulls.create = mockCreatePR as any;
    await forwardMerger.mergeForward();

    expect(mockCreatePR.mock.calls[0][0].base).toBe("branch-22.04");
  }, 11000)

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
      }]
      const mockListBranchesPaginate = jest.fn().mockName("listBranches").mockResolvedValue(branches);
      forwardMerger.context.octokit.paginate = mockListBranchesPaginate as any;
      const mockListBranches = jest.fn().mockName("listBranches").mockResolvedValue("something");
      forwardMerger.context.octokit.repos.listBranches = mockListBranches as any;

      const result = await forwardMerger.getBranches();

      expect(result.length).toEqual(2);
      expect(result[0]).toEqual("branch-21.12");
      expect(result[1]).toEqual("branch-21.10");
      expect(mockListBranchesPaginate.mock.calls[0][0]).toBe(mockListBranches)
      expect(mockListBranchesPaginate.mock.calls[0][1]).toMatchObject({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
      });
  })

  test("sortBranches should sort branches by version", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-21.12",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const branches = ["branch-21.12", "branch-21.10", "branch-19.10", "branch-22.02"]

      const result = forwardMerger.sortBranches(branches);

      expect(result.length).toEqual(4);
      expect(result[0]).toEqual("branch-19.10");
      expect(result[1]).toEqual("branch-21.10");
      expect(result[2]).toEqual("branch-21.12");
      expect(result[3]).toEqual("branch-22.02");
  })

  test("sortBranches should sort 0.9/0.10-type branches", async () => {
    const context = makePushContext({
        ref: "refs/heads/branch-21.12",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = ["branch-0.12", "branch-0.10", "branch-2.10", "branch-1.02"]

        const result = forwardMerger.sortBranches(branches);

        expect(result.length).toEqual(4);
        expect(result[0]).toEqual("branch-0.10");
        expect(result[1]).toEqual("branch-0.12");
        expect(result[2]).toEqual("branch-1.02");
        expect(result[3]).toEqual("branch-2.10");
})

  test("getNextBranch should return next branch", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-21.12",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const branches = ["branch-21.12", "branch-21.10", "branch-22.02"]
      const sortedBranches = forwardMerger.sortBranches(branches)
      const result = await forwardMerger.getNextBranch(sortedBranches);

      expect(result).toEqual("branch-22.02");
  })

  test("getNextBranch should return null if there is no next branch", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-22.02",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const branches = ["branch-21.12", "branch-21.10", "branch-22.02"]
      const sortedBranches = forwardMerger.sortBranches(branches)
      const result = await forwardMerger.getNextBranch(sortedBranches);

      expect(result).toBeFalsy();
  })

  test("issueComment should create comment", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-22.02",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const mockCreateComment = jest.fn().mockName("createComment").mockResolvedValue(null);
      forwardMerger.context.octokit.issues.createComment = mockCreateComment as any;
      await forwardMerger.issueComment(1, "comment");

      expect(mockCreateComment.mock.calls[0][0]).toMatchObject({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: 1,
          body: "comment",
      });
  })
})
