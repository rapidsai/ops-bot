import { JenkinsPermissions } from "../src/plugins/JobComponentTrigger/jenkins_permission";
import axios from "axios";
import { readFileSync } from "fs";
import { assert } from "console";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";
import { mockOrgMembership, mockPaginate } from "./mocks";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const jenkinsConfig = readFileSync(
  "./test/fixtures/responses/jenkins_config.xml"
);

describe("Jenkins Permissions", () => {
  beforeEach(() => {
    const resp = { data: jenkinsConfig };
    mockedAxios.get.mockResolvedValue(resp);

    mockOrgMembership.mockReset();
    mockPaginate.mockReset();
  });

  test("username in adminlist", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gputester run gpu build",
      username: "raydouglass",
    });

    const result = await new JenkinsPermissions().hasPermissionToTrigger(
      context
    );
    assert(result);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockOrgMembership).toBeCalledTimes(0);
  });

  test("username in allowlist", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gputester run gpu build",
      username: "AK-ayush",
    });

    const result = await new JenkinsPermissions().hasPermissionToTrigger(
      context
    );
    assert(result);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockOrgMembership).toBeCalledTimes(0);
  });

  test("username in org", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gputester run gpu build",
      username: "someone",
    });
    mockOrgMembership.mockResolvedValueOnce({ status: 204 });

    const result = await new JenkinsPermissions().hasPermissionToTrigger(
      context
    );
    assert(result);
    expect(mockPaginate).toBeCalledTimes(0);
    expect(mockOrgMembership).toBeCalledTimes(1);
  });

  test("ok to test", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gputester run gpu build",
      username: "someone",
    });
    mockOrgMembership.mockResolvedValueOnce({ status: 404 });
    mockPaginate.mockResolvedValueOnce([{
      user: {
        login: "raydouglass",
      },
      body: "ok to test",
    }]);

    const result = await new JenkinsPermissions().hasPermissionToTrigger(
      context
    );
    assert(result);
    expect(mockPaginate).toBeCalledTimes(1);
    expect(mockOrgMembership).toBeCalledTimes(1);
  });

  test("ok to test - nonadmin", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gputester run gpu build",
      username: "someone",
    });
    mockOrgMembership.mockResolvedValueOnce({ status: 404 });
    mockPaginate.mockResolvedValueOnce([{
      user: {
        login: "not-an-admin",
      },
      body: "ok to test",
    }]);

    const result = await new JenkinsPermissions().hasPermissionToTrigger(
      context
    );
    assert(!result);
    expect(mockPaginate).toBeCalledTimes(1);
    expect(mockOrgMembership).toBeCalledTimes(1);
  });
});
