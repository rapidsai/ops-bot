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

import { RerunTests } from "../src/plugins/RerunTests/rerun_tests";
import { makeIssueCommentContext } from "./fixtures/contexts/issue_comment";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateCommitStatus,
} from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import axios from "axios";
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Rerun Tests", () => {
  const env = process.env;

  beforeEach(() => {
    mockCreateCommitStatus.mockReset();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    jest.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  beforeAll(() => {
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(makeConfigReponse({ rerun_tests: true }));
  });

  test("issue is not a PR", async () => {
    const context = makeIssueCommentContext({ is_pr: false });

    await new RerunTests(context).maybeRerunTests();

    expect(mockedAxios.get).not.toBeCalled();
    expect(mockedAxios.post).not.toBeCalled();
  });

  test("PR comment is not rerun tests", async () => {
    const context = makeIssueCommentContext({
      is_pr: true,
      body: "some random body",
    });

    await new RerunTests(context).maybeRerunTests();

    expect(mockedAxios.get).not.toBeCalled();
    expect(mockedAxios.post).not.toBeCalled();
  });

  test.each([
    [
      true,
      "https://gpuci.gpuopenanalytics.com/job/private-repos-ci/job/orgs/job/cudf/job/pull-request%2F468/build",
    ],
    [
      false,
      "https://gpuci.gpuopenanalytics.com/job/orgs/job/cudf/job/pull-request%2F468/build",
    ],
  ])("PR comment is /rerun tests", async (isPrivateRepo, expectedPostUrl) => {
    const context = makeIssueCommentContext({
      is_pr: true,
      is_private: isPrivateRepo,
      body: "/rerun tests",
    });
    mockedAxios.get.mockResolvedValueOnce({ data: "Jenkins-Crumb:abc1234" });
    process.env.JENKINS_USERNAME = "jenkinsuser";
    process.env.JENKINS_TOKEN = "jenkinstoken";

    await new RerunTests(context).maybeRerunTests();

    expect(mockedAxios.get).toBeCalledTimes(1);
    expect(mockedAxios.post).toBeCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://gpuci.gpuopenanalytics.com/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,%22:%22,//crumb)",
      {
        auth: {
          username: "jenkinsuser",
          password: "jenkinstoken",
        },
      }
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(expectedPostUrl, null, {
      auth: {
        username: "jenkinsuser",
        password: "jenkinstoken",
      },
      headers: {
        "Jenkins-Crumb": "abc1234",
      },
    });
  });
});
