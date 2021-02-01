import { JenkinsPermissions } from "../src/plugins/JobComponentTrigger/jenkins_permission";
import {
  JobComponentTrigger,
  TriggerCommand,
  ENABLED_REPOSITORIES,
} from "../src/plugins/JobComponentTrigger/job_component_trigger";
import axios from "axios";
import { readFileSync } from "fs";
import { assert } from "console";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";
import { mockPullsGet } from "./mocks";
import { default as pulls_get } from "./fixtures/responses/pulls_get.json";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedHasPermissionToTrigger = jest.fn();
const mockedJenkinsPermissions = {
  hasPermissionToTrigger: mockedHasPermissionToTrigger,
} as JenkinsPermissions;

describe("Job Component Triggering", () => {
  beforeEach(() => {
    //Ensure the mocked repo is in the list
    ENABLED_REPOSITORIES.push("rapidsai/cudf");
    mockedHasPermissionToTrigger.mockReset();
    mockedAxios.post.mockReset();
  });

  test.each([
    ["invalid", "make a comment", TriggerCommand.INVALID],
    ["invalid2", "@gpucibot run build", TriggerCommand.INVALID],
    ["rerun tests", "@gpucibot rerun tests", TriggerCommand.ALL],
    ["run tests", "@gpucibot run tests", TriggerCommand.ALL],
    ["run cuda", "@gpucibot run cuda build", TriggerCommand.CUDA_ONLY],
    ["run python", "@gpucibot run python build", TriggerCommand.PYTHON_ONLY],
    ["run gpu", "@gpucibot run gpu build", TriggerCommand.GPU_ONLY],
  ])("issue_comment - %s", async (_, body, command) => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: body,
    });
    const result = new JobComponentTrigger(
      context,
      mockedJenkinsPermissions
    ).parseCommentBody(body);
    expect(result).toBe(command);
  });

  test("repo not enabled", async () => {
    ENABLED_REPOSITORIES.length = 0;
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gpucibot run tests",
    });
    const result = await new JobComponentTrigger(
      context,
      mockedJenkinsPermissions
    ).maybeTriggerJobs();
    expect(result).toBe(false);
    expect(mockedHasPermissionToTrigger).toBeCalledTimes(0);
    expect(mockedAxios.post).toBeCalledTimes(0);
  });

  test("comment is not on a PR", async () => {
    const context = makeIssueCommentContext({
      is_pr: false,
      body: "@gpucibot run tests",
    });
    const result = await new JobComponentTrigger(
      context,
      mockedJenkinsPermissions
    ).maybeTriggerJobs();
    expect(result).toBe(false);
    expect(mockedHasPermissionToTrigger).toBeCalledTimes(0);
    expect(mockedAxios.post).toBeCalledTimes(0);
  });
  test("comment is not valid command", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gpucibot do something",
    });
    const result = await new JobComponentTrigger(
      context,
      mockedJenkinsPermissions
    ).maybeTriggerJobs();
    expect(result).toBe(false);
    expect(mockedHasPermissionToTrigger).toBeCalledTimes(0);
    expect(mockedAxios.post).toBeCalledTimes(0);
  });

  test("doesn't have permissions", async () => {
    mockedHasPermissionToTrigger.mockResolvedValueOnce(false);
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gpucibot run tests",
    });
    const result = await new JobComponentTrigger(
      context,
      mockedJenkinsPermissions
    ).maybeTriggerJobs();
    expect(result).toBe(false);
    expect(mockedHasPermissionToTrigger).toBeCalledTimes(1);
    expect(mockedAxios.post).toBeCalledTimes(0);
  });

  test("trigger allowed", async () => {
    mockedHasPermissionToTrigger.mockResolvedValueOnce(true);
    mockPullsGet.mockResolvedValueOnce(pulls_get);
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "@gpucibot run tests",
    });
    const result = await new JobComponentTrigger(
      context,
      mockedJenkinsPermissions
    ).maybeTriggerJobs();
    expect(result).toBe(true);
    expect(mockedHasPermissionToTrigger).toBeCalledTimes(1);
    expect(mockedAxios.post).toBeCalledTimes(1);
    const jenkinsPayload = mockedAxios.post.mock.calls[0][1];
    expect(jenkinsPayload.pr_id).toBe(468);
    expect(jenkinsPayload.commit_hash).toBe("origin/pr/468/merge");
    expect(jenkinsPayload.report_hash).toBe(pulls_get.data.head.sha);
    expect(jenkinsPayload.pr_author).toBe(pulls_get.data.user.login);
    expect(jenkinsPayload.source_branch).toBe(pulls_get.data.head.ref);
    expect(jenkinsPayload.target_branch).toBe(pulls_get.data.base.ref);
    expect(jenkinsPayload.flash_id).toBe(468);
    expect(jenkinsPayload.repository).toBe("rapidsai/cudf");
    expect(jenkinsPayload.trigger).toBe(TriggerCommand.ALL);
  });
});
