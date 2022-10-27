/*
 * Copyright (c) 2022, NVIDIA CORPORATION.
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

import { PRCopyPRs } from "../src/plugins/CopyPRs/pr";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateComment,
  mockCreateRef,
  mockDeleteRef,
  mockCheckMembershipForUser,
  mockPaginate,
  mockPullsGet,
  mockUpdateRef,
  mockGetUserPermissionLevel,
} from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";
import { CommentCopyPRs } from "../src/plugins/CopyPRs/comment";

describe("External Contributors", () => {
  beforeEach(() => {
    mockCheckMembershipForUser.mockReset();
    mockGetUserPermissionLevel.mockReset();
    mockUpdateRef.mockReset();
    mockCreateRef.mockReset();
    mockPullsGet.mockReset();
    mockPaginate.mockReset();
    mockDeleteRef.mockReset();
  });

  beforeAll(() => {
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(makeConfigReponse({ copy_prs: true }));
  });

  test("pull_request.opened, create branch when author is org member", async () => {
    const prContext = makePRContext({ action: "opened", user: "ayode" });
    mockCheckMembershipForUser.mockResolvedValueOnce({ status: 204 });

    await new PRCopyPRs(prContext).maybeCopyPR();

    expect(mockCreateComment).toBeCalledTimes(0);
    expect(mockCreateRef).toBeCalledTimes(1);
    expect(mockCheckMembershipForUser).toBeCalledWith({
      username: "ayode",
      org: "rapidsai",
    });
  });

  test("pull_request.opened, create correct comment when author is external contibutor", async () => {
    const prContext = makePRContext({ action: "opened", user: "ayodes" });
    mockCheckMembershipForUser.mockResolvedValueOnce({ status: 302 });
    mockCreateComment.mockResolvedValueOnce(true);

    await new PRCopyPRs(prContext).maybeCopyPR();

    expect(mockCreateComment).toBeCalledTimes(1);
    expect(mockCheckMembershipForUser).toBeCalledWith({
      username: "ayodes",
      org: "rapidsai",
    });
    expect(mockCreateComment).toBeCalledWith({
      owner: prContext.payload.repository.owner.login,
      repo: prContext.payload.repository.name,
      issue_number: prContext.payload.pull_request.id,
      body: "Pull requests from external contributors require approval from a `rapidsai` organization member with `write` or `admin` permissions before CI can begin.",
    });
    expect(mockCreateRef).toBeCalledTimes(0);
  });

  test("pull_request.synchronize, update ref for org member", async () => {
    const prContext = makePRContext({ action: "synchronize", user: "ayode" });
    mockCheckMembershipForUser.mockResolvedValueOnce({ status: 204 });

    await new PRCopyPRs(prContext).maybeCopyPR();

    expect(mockUpdateRef).toBeCalledTimes(1);
    expect(mockGetUserPermissionLevel).toBeCalledTimes(0);
  });

  test("pull_request.reopened, update ref for org members", async () => {
    const prContext = makePRContext({ action: "reopened", user: "ayodes" });
    mockCheckMembershipForUser.mockResolvedValueOnce({ status: 204 });

    await new PRCopyPRs(prContext).maybeCopyPR();

    expect(mockCheckMembershipForUser).toBeCalledWith({
      username: "ayodes",
      org: "rapidsai",
    });
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockUpdateRef).toBeCalledTimes(1);
  });

  test("pull_request.closed, delete source branch", async () => {
    const prContext = makePRContext({ action: "closed", user: "ayode" });
    mockDeleteRef.mockResolvedValueOnce(true);

    await new PRCopyPRs(prContext).maybeCopyPR();

    expect(mockDeleteRef).toHaveBeenCalledTimes(1);
    expect(mockDeleteRef).toHaveBeenCalledWith({
      ref: `heads/pull-request/${prContext.payload.pull_request.number}`,
      repo: prContext.payload.repository.name,
      owner: prContext.payload.repository.owner.login,
    });
  });

  test("issue_comment.created, do nothing if comment is not ok to test", async () => {
    const issueContext = makeIssueCommentContext({
      is_pr: true,
      body: "something other than okay to test",
    });

    await new CommentCopyPRs(issueContext).maybeCopyPR();

    expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(0);
  });

  test.each([["/ok to test"], ["/okay to test"]])(
    "issue_comment.created, do nothing if issue is not PR",
    async (body) => {
      const issueContext = makeIssueCommentContext({ is_pr: false, body });

      await new CommentCopyPRs(issueContext).maybeCopyPR();

      expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(0);
    }
  );

  test.each([["/ok to test"], ["/okay to test"]])(
    "issue_comment.created, do nothing if issue author is org member",
    async (body) => {
      const issueContext = makeIssueCommentContext({ is_pr: true, body });

      mockCheckMembershipForUser.mockResolvedValueOnce({ status: 204 });
      await new CommentCopyPRs(issueContext).maybeCopyPR();

      expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(1);
    }
  );

  test.each([["/ok to test"], ["/okay to test"]])(
    "issue_comment.created, if commenter has insufficient permissions",
    async (body) => {
      const issueContext = makeIssueCommentContext({ is_pr: true, body });
      mockGetUserPermissionLevel.mockResolvedValueOnce({
        data: { permission: "non-admin" },
      });
      mockCheckMembershipForUser.mockResolvedValueOnce({ status: 302 });
      await new CommentCopyPRs(issueContext).maybeCopyPR();

      expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(1);
      expect(mockGetUserPermissionLevel).toHaveBeenCalledWith({
        owner: issueContext.payload.repository.owner.login,
        username: issueContext.payload.comment.user.login,
        repo: issueContext.payload.repository.name,
      });
    }
  );

  test.each([
    ["/ok to test", "admin"],
    ["/okay to test", "write"],
  ])(
    "issue_comment.created, copy code from forked repository to source repository if valid comment & branch doesn't exist",
    async (body, permission) => {
      const issueContext = makeIssueCommentContext({ is_pr: true, body });
      mockGetUserPermissionLevel.mockResolvedValueOnce({
        data: { permission },
      });
      mockPullsGet.mockResolvedValueOnce({
        data: { head: { sha: "sha1234" } },
      });
      mockCheckMembershipForUser.mockResolvedValueOnce({ status: 302 });
      mockUpdateRef.mockRejectedValueOnce("");

      await new CommentCopyPRs(issueContext).maybeCopyPR();

      expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(1);
      expect(mockCreateRef).toHaveBeenCalledWith({
        ref: `refs/heads/pull-request/${issueContext.payload.issue.number}`,
        repo: issueContext.payload.repository.name,
        owner: issueContext.payload.repository.owner.login,
        sha: "sha1234",
      });
      expect(mockPullsGet).toHaveBeenCalledTimes(1);
      expect(mockUpdateRef).toHaveBeenCalledTimes(1);
      expect(mockCreateRef).toHaveBeenCalledTimes(1);
    }
  );

  test.each([
    ["/ok to test", "admin"],
    ["/okay to test", "write"],
  ])(
    "issue_comment.created, copy code from forked repository to source repository if valid comment & branch does exist",
    async (body, permission) => {
      const issueContext = makeIssueCommentContext({ is_pr: true, body });
      mockGetUserPermissionLevel.mockResolvedValueOnce({
        data: { permission },
      });
      mockPullsGet.mockResolvedValueOnce({
        data: { head: { sha: "sha1234" } },
      });
      mockCheckMembershipForUser.mockResolvedValueOnce({ status: 302 });

      await new CommentCopyPRs(issueContext).maybeCopyPR();

      expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(1);
      expect(mockUpdateRef).toHaveBeenCalledWith({
        ref: `heads/pull-request/${issueContext.payload.issue.number}`,
        repo: issueContext.payload.repository.name,
        owner: issueContext.payload.repository.owner.login,
        sha: "sha1234",
        force: true,
      });
      expect(mockPullsGet).toHaveBeenCalledTimes(1);
      expect(mockUpdateRef).toHaveBeenCalledTimes(1);
      expect(mockCreateRef).toHaveBeenCalledTimes(0);
    }
  );
});
