import { mockCheckMembershipForUser, mockConfigGet, mockContextRepo, mockExit, mockPaginate } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import axios from "axios";
import { readFileSync } from "fs";
import { PermissionsChecker } from "../src/plugins/ExternalContributors/permissions_checker";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const jenkinsConfig = readFileSync(
  "./test/fixtures/responses/jenkins_config.xml"
);

describe('Permissions Checker', () => {
    beforeEach(() => {
        const resp = { data: jenkinsConfig };
        mockedAxios.get.mockResolvedValue(resp);
    
        mockCheckMembershipForUser.mockReset();
        mockPaginate.mockReset();
    })

    beforeAll(() => {
        mockContextRepo.mockReturnValue(repoResp);
        mockExit.mockReset();
        mockConfigGet.mockResolvedValue(makeConfigReponse({ external_contributors: true }));
    })

    test('allow if username in adminlist', async () => {
        const context = makeIssueCommentContext();
    
        const result = await new PermissionsChecker(context.octokit).hasPermissionToTrigger(
            "raydouglass", 
            "cudf", 
            "rapidsai"
        );
        expect(result).toBe(true);
        expect(mockCheckMembershipForUser).toBeCalledTimes(0);
    })

    test('allow if username in allowlist', async () => {
        const context = makeIssueCommentContext();

        const result = await new PermissionsChecker(context.octokit).hasPermissionToTrigger(
            "AK-ayush", 
            "cudf", 
            "rapidsai"
        );

        expect(result).toBe(true);
        expect(mockCheckMembershipForUser).toBeCalledTimes(0);
    })

    test('allow if username in org', async () => {
        const context = makeIssueCommentContext();
        mockCheckMembershipForUser.mockResolvedValueOnce({ status: 204 });
    
        const result = await new PermissionsChecker(context.octokit).hasPermissionToTrigger(
            "someone", 
            "cudf", 
            "rapidsai"
        );

        expect(result).toBe(true);
        expect(mockCheckMembershipForUser).toBeCalledTimes(1);
    })

    test('fail', async () => {
        const context = makeIssueCommentContext();
        mockCheckMembershipForUser.mockResolvedValueOnce({ status: 404 });
    
        const result = await new PermissionsChecker(context.octokit).hasPermissionToTrigger(
            "someone", 
            "cudf", 
            "rapidsai"
        );

        expect(result).toBe(false);
        expect(mockCheckMembershipForUser).toBeCalledTimes(1);
    })    
})