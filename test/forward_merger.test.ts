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
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateComment,
  mockCreatePR,
  mockListBranches,
  mockMerge,
  mockPaginate,
} from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";

describe("Forward Merger", () => {
  beforeEach(() => {
    mockCreatePR.mockReset();
    mockMerge.mockReset();
    mockListBranches.mockReset();
    mockPaginate.mockReset();
    mockCreateComment.mockReset();
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
});
