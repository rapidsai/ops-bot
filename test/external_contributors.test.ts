import { PermissionsChecker } from "../src/plugins/ExternalContributors/permissions_checker";
import { PRExternalContributors } from "../src/plugins/ExternalContributors/pr_ex_contibutors";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import { mockConfigGet, mockContextRepo, mockCreateComment, mockCreateCommitStatus, mockCreateRef, mockDeleteRef, mockExit, mockCheckMembershipForUser, mockGetRef, mockHasPermissionToTrigger, mockPaginate, mockPullsGet, mockUpdateRef } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";
import { PRReviewExternalContributors } from "../src/plugins/ExternalContributors/pr_review_ex_contributors";

describe('External Contributors', () => {
    beforeEach(() => {
        mockCheckMembershipForUser.mockReset()
        mockHasPermissionToTrigger.mockReset()
        mockUpdateRef.mockReset()
        mockCreateRef.mockReset()
        mockPullsGet.mockReset()
    })

    beforeAll(() => {
        mockContextRepo.mockReturnValue(repoResp);
        mockExit.mockReset();
        mockConfigGet.mockResolvedValue(makeConfigReponse({ external_contributors: true }));
    })

    afterAll(() => {
        expect(mockExit).toBeCalledTimes(0);
    })

    test('pull_request.opened, do nothing when author is not external contributor', async () => {
        const prContext = makePRContext({action: "opened", senderName: "ayode"})
        mockCheckMembershipForUser.mockResolvedValueOnce({status: 204})

        const action = await new PRExternalContributors(prContext, <any>null).pipePR()
        
        expect(mockCreateComment).toBeCalledTimes(0)
        expect(mockCheckMembershipForUser).toBeCalledWith({username: prContext.payload.sender.login, org: prContext.payload.organization?.login})
        expect(action).toBe(undefined)
    })

    test('pull_request.opened, create correct comment when author is external contibutor', async () => {
        const prContext = makePRContext({action: "opened", senderName: "ayode"})
        mockCheckMembershipForUser.mockResolvedValueOnce({status: 302})
        mockCreateComment.mockResolvedValueOnce(true)

        const action = await new PRExternalContributors(prContext, <any>null).pipePR()
        
        expect(mockCreateComment).toBeCalledTimes(1)
        expect(mockCheckMembershipForUser).toBeCalledWith({username: prContext.payload.sender.login, org: prContext.payload.organization?.login})
        expect(action).toBe(true)
        expect(mockCreateComment).toBeCalledWith({
            owner: prContext.payload.repository.owner.login,
            repo: prContext.payload.repository.name,
            issue_number: prContext.payload.pull_request.id,
            body: "Pull requests from external contributors require approval from a RAPIDS organization member before CI can begin."
        })
    })

    test('pull_request.synchronize, do nothing when no existing okay-to-test comments', async () => {
        const prContext = makePRContext({action: "synchronize", senderName: "ayode"})
        mockPaginate.mockResolvedValueOnce([{body: "other comment"}])

        const action = await new PRExternalContributors(prContext, null as any).pipePR()

        expect(action).toBe(undefined)
        expect(mockUpdateRef).toBeCalledTimes(0)
        expect(mockPaginate).toBeCalledTimes(1)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('pull_request.synchronize, do nothing when existing okay-to-test comment has insufficient permission', 
        async (commentBody) => {
            const prContext = makePRContext({action: "synchronize", senderName: "ayode"})
            mockPaginate.mockResolvedValueOnce([{body: commentBody, user: {login: "ayode"}}])
            mockHasPermissionToTrigger.mockResolvedValueOnce(false)
            
            const action = await new PRExternalContributors(prContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

            expect(action).toBe(undefined)
            expect(mockUpdateRef).toBeCalledTimes(0)
            expect(mockHasPermissionToTrigger).toBeCalledTimes(1)
            expect(mockHasPermissionToTrigger).toHaveBeenCalledWith(
                "ayode", 
                prContext.payload.repository.name, 
                prContext.payload.repository.owner.login
            )
        }
    )

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('pull_request.synchronize, when valid existing okay-to-test comment, update commit in source repo', 
        async (commentBody) => {
            const prContext = makePRContext({action: "synchronize", senderName: "ayode"})
            mockPaginate.mockResolvedValueOnce([{body: commentBody}])
            mockHasPermissionToTrigger.mockResolvedValueOnce(true)
            mockUpdateRef.mockResolvedValueOnce(true)

            const action = await new PRExternalContributors(prContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

            expect(action).toBe(true)
            expect(mockUpdateRef).toBeCalledTimes(1)
            expect(mockHasPermissionToTrigger).toBeCalledTimes(1)
            expect(mockUpdateRef).toBeCalledTimes(1)
            expect(mockUpdateRef).toBeCalledWith({
                ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
                repo: prContext.payload.repository.name,
                owner: prContext.payload.repository.owner.login,
                sha: prContext.payload.pull_request.head.sha
            })
        }
    )

    test('pull_request.closed, do nothing if source branch no longer exists', async () => {
        const prContext = makePRContext({action: "closed", senderName: "ayode"})
        mockGetRef.mockResolvedValueOnce({status: 404})

        const action = await new PRExternalContributors(prContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

        expect(action).toBe(undefined)
        expect(mockDeleteRef).toHaveBeenCalledTimes(0)
        expect(mockGetRef).toHaveBeenCalled()
        expect(mockGetRef).toBeCalledWith({
            ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
            repo: prContext.payload.repository.name,
            owner: prContext.payload.repository.owner.login,
        })
    })

    test('pull_request.closed, delete source branch if still exists', async () => {
        const prContext = makePRContext({action: "closed", senderName: "ayode"})
        mockGetRef.mockResolvedValueOnce({status: 200})
        mockDeleteRef.mockResolvedValueOnce(true)

        const action = await new PRExternalContributors(prContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

        expect(action).toBe(true)
        expect(mockDeleteRef).toHaveBeenCalledTimes(1)
        expect(mockGetRef).toHaveBeenCalled()
        expect(mockGetRef).toBeCalledWith({
            ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
            repo: prContext.payload.repository.name,
            owner: prContext.payload.repository.owner.login,
        })
        expect(mockDeleteRef).toHaveBeenCalledWith({
            ref: `heads/external-pr-${prContext.payload.pull_request.number}`,
            repo: prContext.payload.repository.name,
            owner: prContext.payload.repository.owner.login,
        })
    })

    test('issue_comment.created, do nothing if comment is not ok to test', async () => {
        const issueContext = makeIssueCommentContext({is_pr: true, body: "something other than okay to test"})

        const action = await new PRReviewExternalContributors(issueContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

        expect(action).toBe(undefined)
        expect(mockHasPermissionToTrigger).toHaveBeenCalledTimes(0)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('issue_comment.created, do nothing if issue is not PR', async (body) => {
        const issueContext = makeIssueCommentContext({is_pr: false, body})

        const action = await new PRReviewExternalContributors(issueContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

        expect(action).toBe(false)
        expect(mockHasPermissionToTrigger).toHaveBeenCalledTimes(0)
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('issue_comment.created, if commenter has insufficient permissions', async (body) => {
        const issueContext = makeIssueCommentContext({is_pr: true, body})
        mockHasPermissionToTrigger.mockResolvedValueOnce(false)

        const action = await new PRReviewExternalContributors(issueContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

        expect(action).toBe(false)
        expect(mockHasPermissionToTrigger).toHaveBeenCalledWith(
            issueContext.payload.comment.user.login, 
            issueContext.payload.repository.name, 
            issueContext.payload.repository.owner.login
        )
    })

    test.each([
        ["ok to test"],
        ["okay to test"],
      ])('issue_comment.created, copy code from forked repository to source repository if valid comment', async (body) => {
        const issueContext = makeIssueCommentContext({is_pr: true, body})
        mockHasPermissionToTrigger.mockResolvedValueOnce(true)
        mockPullsGet.mockResolvedValueOnce({data:{head:{sha: "sha1234"}}})
        mockCreateRef.mockResolvedValueOnce(true)

        const action = await new PRReviewExternalContributors(issueContext, <PermissionsChecker>{hasPermissionToTrigger: <any>mockHasPermissionToTrigger}).pipePR()

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