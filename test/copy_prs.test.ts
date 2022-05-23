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
import { mockConfigGet, mockContextRepo, mockCreateComment, mockCreateRef, mockDeleteRef, mockCheckMembershipForUser, mockPaginate, mockPullsGet, mockUpdateRef, mockGetUserPermissionLevel, mockGetRef } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";
import { CommentCopyPRs } from "../src/plugins/CopyPRs/comment";

describe('External Contributors', () => {
    beforeEach(() => {
        mockCheckMembershipForUser.mockReset()
        mockGetUserPermissionLevel.mockReset()
        mockUpdateRef.mockReset()
        mockCreateRef.mockReset()
        mockPullsGet.mockReset()
        mockPaginate.mockReset()
    })

    beforeAll(() => {
        mockContextRepo.mockReturnValue(repoResp);
        mockConfigGet.mockResolvedValue(makeConfigReponse({ copy_prs: true }));
    })

    afterAll(() => {
        
    })

    test('pull_request.opened, do nothing when author is not external contributor', async () => {
        const prContext = makePRContext({action: "opened", user: "ayode"})
        mockCheckMembershipForUser.mockResolvedValueOnce({status: 204})

        const action = await new PRCopyPRs(prContext).maybeCopyPR()
        
        expect(mockCreateComment).toBeCalledTimes(0)
        expect(mockCheckMembershipForUser).toBeCalledWith({username: "ayode", org: "rapidsai"})
        expect(action).toBe(undefined)
    })

    test('pull_request.opened, create correct comment when author is external contibutor', async () => {
        const prContext = makePRContext({action: "opened", user: "ayodes"})
        mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
        mockCreateComment.mockResolvedValueOnce(true)

        await new PRCopyPRs(prContext).maybeCopyPR()
        
        expect(mockCreateComment).toBeCalledTimes(1)
        expect(mockCheckMembershipForUser).toBeCalledWith({username: "ayodes", org: "rapidsai"})
        expect(mockCreateComment).toBeCalledWith({
            owner: prContext.payload.repository.owner.login,
            repo: prContext.payload.repository.name,
            issue_number: prContext.payload.pull_request.id,
            body: "Pull requests from external contributors require approval from a RAPIDS organization member before CI can begin."
        })
    })

    test('pull_request.synchronize, do nothing when no comments at all', async () => {
        const prContext = makePRContext({action: "synchronize", user: "ayode"})
        mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
        mockPaginate.mockResolvedValueOnce([])

        const action = await new PRCopyPRs(prContext).maybeCopyPR()

        expect(action).toBe(undefined)
        expect(mockUpdateRef).toBeCalledTimes(0)
        expect(mockPaginate).toBeCalledTimes(1)
    })

    test('pull_request.synchronize, do nothing when no existing okay-to-test comments', async () => {
        const prContext = makePRContext({action: "synchronize", user: "ayode"})
        mockPaginate.mockResolvedValueOnce([{body: "other comment"}])

        const action = await new PRCopyPRs(prContext).maybeCopyPR()

        expect(action).toBe(undefined)
        expect(mockUpdateRef).toBeCalledTimes(0)
        expect(mockPaginate).toBeCalledTimes(1)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('pull_request.synchronize, do nothing when existing okay-to-test comment has insufficient permission', 
        async (commentBody) => {
            const prContext = makePRContext({action: "synchronize", user: "ayode"})
            mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
            mockPaginate.mockResolvedValueOnce([{body: commentBody, user: {login: "ayode"}}])
            mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission: "non-admin"}})
            
            const action = await new PRCopyPRs(prContext).maybeCopyPR()

            expect(action).toBe(undefined)
            expect(mockUpdateRef).toBeCalledTimes(0)
            expect(mockGetUserPermissionLevel).toBeCalledTimes(1)
            expect(mockGetUserPermissionLevel).toHaveBeenCalledWith({
                username: "ayode", 
                repo: prContext.payload.repository.name, 
                owner: prContext.payload.repository.owner.login
            })
        }
    )

    test.each([
        ["ok to test", "admin"],
        ["okay to test", "write"],
      ])('pull_request.synchronize, when valid existing okay-to-test comment, update commit in source repo', 
        async (commentBody, permission) => {
            const prContext = makePRContext({action: "synchronize", user: "ayode"})
            mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
            mockPaginate.mockResolvedValueOnce([{body: commentBody, user:{login: "jake"}}])
            mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission}})
            mockUpdateRef.mockResolvedValueOnce(true)

            const action = await new PRCopyPRs(prContext).maybeCopyPR()

            expect(action).toBe(true)
            expect(mockUpdateRef).toBeCalledTimes(1)
            expect(mockGetUserPermissionLevel).toBeCalledTimes(1)
            expect(mockUpdateRef).toBeCalledTimes(1)
            expect(mockUpdateRef).toBeCalledWith({
                ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
                repo: prContext.payload.repository.name,
                owner: prContext.payload.repository.owner.login,
                sha: prContext.payload.pull_request.head.sha,
                force: true
            })
        }
    )

    test('pull_request.reopened, do nothing when no comments at all', async () => {
        const prContext = makePRContext({action: "reopened", user: "ayode"})
        mockPaginate.mockResolvedValueOnce([])

        const action = await new PRCopyPRs(prContext).maybeCopyPR()

        expect(action).toBe(undefined)
        expect(mockUpdateRef).toBeCalledTimes(0)
        expect(mockPaginate).toBeCalledTimes(1)
    })

    test('pull_request.reopened, do nothing when no existing okay-to-test comments', async () => {
        const prContext = makePRContext({action: "reopened", user: "ayode"})
        mockPaginate.mockResolvedValueOnce([{body: "other comment"}])

        const action = await new PRCopyPRs(prContext).maybeCopyPR()

        expect(action).toBe(undefined)
        expect(mockUpdateRef).toBeCalledTimes(0)
        expect(mockPaginate).toBeCalledTimes(1)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('pull_request.reopened, do nothing when existing okay-to-test comment has insufficient permission', 
        async (commentBody) => {
            const prContext = makePRContext({action: "reopened", user: "ayode"})
            mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
            mockPaginate.mockResolvedValueOnce([{body: commentBody, user: {login: "ayode"}}])
            mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission: "non-admin"}})
            
            const action = await new PRCopyPRs(prContext).maybeCopyPR()

            expect(action).toBe(undefined)
            expect(mockUpdateRef).toBeCalledTimes(0)
            expect(mockGetUserPermissionLevel).toBeCalledTimes(1)
            expect(mockGetUserPermissionLevel).toHaveBeenCalledWith({
                username: "ayode", 
                repo: prContext.payload.repository.name, 
                owner: prContext.payload.repository.owner.login
            })
        }
    )

    test.each([
        ["ok to test", "admin"],
        ["okay to test", "write"],
      ])('pull_request.reopened, when valid existing okay-to-test comment, update commit in source repo', 
        async (commentBody, permission) => {
            const prContext = makePRContext({action: "reopened", user: "ayode"})
            mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
            mockPaginate.mockResolvedValueOnce([{body: commentBody, user:{login: "jake"}}])
            mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission}})
            mockGetRef.mockResolvedValueOnce({status: 200})
            mockUpdateRef.mockResolvedValueOnce(true)

            const action = await new PRCopyPRs(prContext).maybeCopyPR()

            expect(action).toBe(true)
            expect(mockUpdateRef).toBeCalledTimes(1)
            expect(mockGetUserPermissionLevel).toBeCalledTimes(1)
            expect(mockUpdateRef).toBeCalledTimes(1)
            expect(mockUpdateRef).toBeCalledWith({
                ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
                repo: prContext.payload.repository.name,
                owner: prContext.payload.repository.owner.login,
                sha: prContext.payload.pull_request.head.sha,
                force: true
            })
        }
    )

    test.each([
        ["ok to test", "admin"],
        ["okay to test", "write"],
      ])('pull_request.reopened, when valid existing okay-to-test comment and branch is deleted, re-create branch in source repo', 
        async (commentBody, permission) => {
            const prContext = makePRContext({action: "reopened", user: "ayode"})
            mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
            mockPaginate.mockResolvedValueOnce([{body: commentBody, user:{login: "jake"}}])
            mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission}})
            mockCreateRef.mockResolvedValueOnce(true)
            mockUpdateRef.mockRejectedValueOnce({status: 422})

            const action = await new PRCopyPRs(prContext).maybeCopyPR()

            expect(action).toBe(true)
            expect(mockCreateRef).toBeCalledTimes(1)
            expect(mockGetUserPermissionLevel).toBeCalledTimes(1)
            expect(mockCreateRef).toBeCalledTimes(1)
            expect(mockUpdateRef).toHaveBeenCalled()
            expect(mockCreateRef).toBeCalledWith({
                ref: `refs/heads/external-pr-${prContext.payload.pull_request.number}`,
                repo: prContext.payload.repository.name,
                owner: prContext.payload.repository.owner.login,
                sha: prContext.payload.pull_request.head.sha,
            })
            expect(mockUpdateRef).toBeCalledWith({
                ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
                repo: prContext.payload.repository.name,
                owner: prContext.payload.repository.owner.login,
                sha: prContext.payload.pull_request.head.sha,
                force: true
            })
        }
    )

    test('pull_request.closed, delete source branch', async () => {
        const prContext = makePRContext({action: "closed", user: "ayode"})
        mockDeleteRef.mockResolvedValueOnce(true)

        const action = await new PRCopyPRs(prContext).maybeCopyPR()

        expect(action).toBe(true)
        expect(mockDeleteRef).toHaveBeenCalledTimes(1)
        expect(mockDeleteRef).toHaveBeenCalledWith({
            ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
            repo: prContext.payload.repository.name,
            owner: prContext.payload.repository.owner.login,
        })
    })

    test('issue_comment.created, do nothing if comment is not ok to test', async () => {
        const issueContext = makeIssueCommentContext({is_pr: true, body: "something other than okay to test"})

        const action = await new CommentCopyPRs(issueContext).maybeCopyPR()

        expect(action).toBe(undefined)
        expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(0)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('issue_comment.created, do nothing if issue is not PR', async (body) => {
        const issueContext = makeIssueCommentContext({is_pr: false, body})

        const action = await new CommentCopyPRs(issueContext).maybeCopyPR()

        expect(action).toBe(false)
        expect(mockCheckMembershipForUser).toHaveBeenCalledTimes(0)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('issue_comment.created, if commenter has insufficient permissions', async (body) => {
        const issueContext = makeIssueCommentContext({is_pr: true, body})
        mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission: "non-admin"}})

        const action = await new CommentCopyPRs(issueContext).maybeCopyPR()

        expect(action).toBe(false)
        expect(mockGetUserPermissionLevel).toHaveBeenCalledWith({
            owner: issueContext.payload.repository.owner.login,
            username: issueContext.payload.comment.user.login, 
            repo: issueContext.payload.repository.name, 
        })
    })

    test.each([
        ["ok to test", "admin"],
        ["okay to test", "write"],
      ])('issue_comment.created, copy code from forked repository to source repository if valid comment', async (body, permission) => {
        const issueContext = makeIssueCommentContext({is_pr: true, body})
        mockGetUserPermissionLevel.mockResolvedValueOnce({data: {permission}})
        mockPullsGet.mockResolvedValueOnce({data:{head:{sha: "sha1234"}}})
        mockCreateRef.mockResolvedValueOnce(true)

        const action = await new CommentCopyPRs(issueContext).maybeCopyPR()

        expect(action).toBeTruthy()    
        expect(mockCreateRef).toHaveBeenCalledWith({
            ref: `refs/heads/external-pr-${issueContext.payload.issue.number}`,
            repo: issueContext.payload.repository.name,
            owner: issueContext.payload.repository.owner.login,
            sha: "sha1234"
        })
        expect(mockPullsGet).toHaveBeenCalledTimes(1)
        expect(mockCreateRef).toHaveBeenCalledTimes(1)
    })
})