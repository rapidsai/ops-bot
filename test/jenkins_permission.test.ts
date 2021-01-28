import { JenkinsPermissions } from "../src/plugins/JobComponentTrigger/jenkins_permission";
import axios from "axios";
import { readFileSync } from "fs";
import { assert } from "console";
import { EventPayloads } from "@octokit/webhooks";
import { ProbotOctokit } from "probot";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const jenkinsConfig = readFileSync("./test/fixtures/responses/jenkins_config.xml");

describe("Jenkins Permissions", () => {
  beforeEach(() => {
    const resp = { data: jenkinsConfig };
    mockedAxios.get.mockResolvedValue(resp);
  });

  test("username in adminlist", async () => {
    const repo = {
      name: "cudf",
      owner: {
        login: "rapidsai",
      },
    } as EventPayloads.PayloadRepository;
    const octokit = {} as InstanceType<typeof ProbotOctokit>;

    const result = await new JenkinsPermissions().hasPermissionToTrigger(
      "raydouglass",
      repo,
      octokit
    );
    assert(result);
  });
});
