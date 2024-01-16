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
    const nextBranch = {
      name: "branch-21.10",
    }
    const mockGetNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
    forwardMerger.getNextBranch = mockGetNextBranch;
    const mockOpenPR = jest.fn().mockName("openPR").mockResolvedValue(null);
    forwardMerger.openPR = mockOpenPR;

    await forwardMerger.mergeForward();

    expect(mockOpenPR).toBeCalledWith(nextBranch);
  })

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
    const mockOpenPR = jest.fn().mockName("openPR").mockResolvedValue(null);
    forwardMerger.openPR = mockOpenPR;

    await forwardMerger.mergeForward();

    expect(mockOpenPR).not.toBeCalled();
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
    const pr = {}
    forwardMerger.openPR = jest.fn().mockName("openPR").mockResolvedValue(pr);
    const mockMergePR = jest.fn().mockName("mergePR").mockResolvedValue({merged:true});
    forwardMerger.mergePR = mockMergePR;
    forwardMerger.issueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);

    await forwardMerger.mergeForward();

    expect(mockMergePR).toBeCalledWith(pr);
  })

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
      forwardMerger.openPR = jest.fn().mockName("openPR").mockResolvedValue(null);
      const mockMergePR = jest.fn().mockName("mergePR").mockResolvedValue(null);
      forwardMerger.mergePR = mockMergePR;

      await forwardMerger.mergeForward();

      expect(mockMergePR).not.toBeCalled();
  })

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
      forwardMerger.getNextBranch = jest.fn().mockName("getNextBranch").mockReturnValue(nextBranch);
      const pr = {
        number: 1,
      }
      forwardMerger.openPR = jest.fn().mockName("openPR").mockResolvedValue(pr);
      forwardMerger.mergePR = jest.fn().mockName("mergePR").mockResolvedValue({merged: true});
      const mockIssueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);
      forwardMerger.issueComment = mockIssueComment;

      await forwardMerger.mergeForward();

      expect(mockIssueComment).toBeCalledWith(pr.number, "**SUCCESS** - forward-merge complete.");
  })

  test("should comment failure on PR if merge is unsuccessful", async () => {
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
    const pr = {
      number: 1,
    }
    forwardMerger.openPR = jest.fn().mockName("openPR").mockResolvedValue(pr);
    forwardMerger.mergePR = jest.fn().mockName("mergePR").mockResolvedValue({merged: false});
    const mockIssueComment = jest.fn().mockName("issueComment").mockResolvedValue(null);
    forwardMerger.issueComment = mockIssueComment;

    await forwardMerger.mergeForward();

    expect(mockIssueComment).toBeCalledWith(pr.number, "**FAILURE** - Unable to forward-merge due to an error, **manual** merge is necessary. Do not use the `Resolve conflicts` option in this PR, follow these instructions https://docs.rapids.ai/maintainers/forward-merger/ \n **IMPORTANT**: When merging this PR, do not use the [auto-merger](https://docs.rapids.ai/resources/auto-merger/) (i.e. the `/merge` comment). Instead, an admin must manually merge by changing the merging strategy to `Create a Merge Commit`. Otherwise, history will be lost and the branches become incompatible.");
  })

  test("mergeForward should obtain the correct next branch from a given list of unsorted branches", async () => {
    const context = makePushContext({
      ref: "refs/heads/branch-22.02",
    });
    const forwardMerger = new ForwardMerger(context, context.payload);
    const branches = [
      {
        name: "branch-22.04"
      },
      {
        name: "branch-21.12",
      },
      {
        name: "branch-21.10",
      },
      {
        name: "branch-22.02",
    }]
    const mockGetBranches = jest.fn().mockName("getBranches").mockResolvedValue(branches);
    const mockOpenPR = jest.fn().mockName("openPR").mockResolvedValue(null)
    forwardMerger.getBranches = mockGetBranches
    forwardMerger.openPR = mockOpenPR
    await forwardMerger.mergeForward();

    expect(mockOpenPR.mock.calls[0][0]).toMatchObject({name: "branch-22.04"});
  })

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
      const mockListBranches = jest.fn().mockName("listBranches").mockResolvedValue({data: branches});
      forwardMerger.context.octokit.repos.listBranches = mockListBranches as any;

      const result = await forwardMerger.getBranches();

      expect(result.length).toEqual(2);
      expect(result[0].name).toEqual("branch-21.12");
      expect(result[1].name).toEqual("branch-21.10");
  })

  test("sortBranches should sort branches by version", async () => {
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
          },
          {
              name: "branch-22.02",
          }]
          const mockListBranches = jest.fn().mockName("listBranches").mockResolvedValue({data: branches});
          forwardMerger.context.octokit.repos.listBranches = mockListBranches as any;

          const result = await forwardMerger.getBranches();

          expect(result.length).toEqual(3);
          expect(result[0].name).toEqual("branch-21.12");
          expect(result[1].name).toEqual("branch-21.10");
          expect(result[2].name).toEqual("branch-22.02");
  })

  test("getNextBranch should return next branch", async () => {
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
          },
          {
              name: "branch-21.10",
          },
          {
              name: "branch-22.02",
          }]
      const sortedBranches = forwardMerger.sortBranches(branches)
      const result = await forwardMerger.getNextBranch(sortedBranches);

      expect(result.name).toEqual("branch-22.02");
  })

  test("getNextBranch should return null if there is no next branch", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-22.02",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const branches = [
          {
              name: "branch-21.12",
          },
          {
              name: "branch-21.10",
          },
          {
              name: "branch-22.02",
          }]
      const sortedBranches = forwardMerger.sortBranches(branches)
      const result = await forwardMerger.getNextBranch(sortedBranches);

      expect(result).toBeFalsy();
  })

  test("openPR should create PR when there is a valid next branch", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-22.02",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const nextBranch = {
          name: "branch-22.04",
      }
      const mockCreatePR = jest.fn().mockName("createPR").mockResolvedValue({data: {number: 1}});
      forwardMerger.context.octokit.pulls.create = mockCreatePR as any;
      const result = await forwardMerger.openPR(nextBranch);

      expect(result!.number).toEqual(1);
      expect(mockCreatePR.mock.calls[0][0]).toMatchObject({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          title: "Forward-merge " + forwardMerger.branchName + " into " + nextBranch.name,
          head: forwardMerger.branchName,
          base: nextBranch.name,
          maintainer_can_modify: true,
          body: `Forward-merge triggered by push to ${forwardMerger.branchName} that creates a PR to keep ${nextBranch.name} up-to-date. If this PR is unable to be immediately merged due to conflicts, it will remain open for the team to manually merge.`,
      });
  })

  test("openPR should return null when there is no next branch", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-22.02",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const nextBranch = null
      const mockCreatePR = jest.fn().mockName("createPR").mockResolvedValue({data: {number: 1}});
      forwardMerger.context.octokit.pulls.create = mockCreatePR as any;
      const result = await forwardMerger.openPR(nextBranch);

      expect(result).toBeFalsy();
      expect(mockCreatePR).not.toBeCalled();
  })

  test("mergePR should merge PR", async () => {
      const context = makePushContext({
          ref: "refs/heads/branch-22.02",
      });
      const forwardMerger = new ForwardMerger(context, context.payload);
      const pr = {
          number: 1,
          head: {
              sha: "sha",
          }
      }
      const mockMergePR = jest.fn().mockName("mergePR").mockResolvedValue({data: {merged: true}});
      forwardMerger.context.octokit.pulls.merge = mockMergePR as any;
      const result = await forwardMerger.mergePR(pr);

      expect(result!.merged).toEqual(true);
      expect(mockMergePR.mock.calls[0][0]).toMatchObject({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          pull_number: pr.number,
          sha: pr.head.sha,
      });
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
