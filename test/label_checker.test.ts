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

import { LabelChecker } from "../src/plugins/LabelChecker/label_checker";
import { makePRContext } from "./fixtures/contexts/pull_request";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import {
  mockConfigGet,
  mockContextRepo,
  mockCreateCommitStatus,
} from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";

describe("Label Checker", () => {
  beforeEach(() => {
    mockCreateCommitStatus.mockReset();
  });

  beforeAll(() => {
    mockContextRepo.mockReturnValue(repoResp);
    mockConfigGet.mockResolvedValue(makeConfigReponse({ label_checker: true }));
  });

  test("no labels", async () => {
    const context = makePRContext({ labels: [] });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category & breaking labels"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("no breaking, one category", async () => {
    const context = makePRContext({ labels: ["bug"] });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing breaking label"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("no category, one breaking", async () => {
    const context = makePRContext({ labels: ["breaking"] });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category label"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("many breaking, one category", async () => {
    const context = makePRContext({
      labels: ["breaking", "non-breaking", "bug"],
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many breaking labels applied"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("many category, one breaking", async () => {
    const context = makePRContext({
      labels: ["bug", "improvement", "breaking"],
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many category labels applied"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("many breaking, no category", async () => {
    const context = makePRContext({
      labels: ["non-breaking", "breaking"],
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing category label & too many breaking labels applied"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("do not merge", async () => {
    const context = makePRContext({
      labels: ["DO NOT MERGE"],
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Contains a `DO NOT MERGE` label"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("many category, many breaking", async () => {
    const context = makePRContext({
      labels: ["bug", "improvement", "breaking", "non-breaking"],
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Too many category & breaking labels applied"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("no breaking, many category", async () => {
    const context = makePRContext({
      labels: ["bug", "improvement"],
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("failure");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Missing breaking label & too many category labels applied"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("correct labels", async () => {
    const context = makePRContext({ labels: ["bug", "breaking"] });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "Correct labels applied"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });

  test("correct labels - rapids-bot PR", async () => {
    const context = makePRContext({
      title: "[gpuCI] Forward-merge branch-0.18 to branch-0.19 [skip ci]",
      user: "rapids-bot[bot]",
    });
    await new LabelChecker(context).checkLabels();
    expect(mockCreateCommitStatus).toBeCalledTimes(2);
    expect(mockCreateCommitStatus.mock.calls[0][0].state).toBe("pending");
    expect(mockCreateCommitStatus.mock.calls[0][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
    expect(mockCreateCommitStatus.mock.calls[0][0].description).toBe(
      "Checking labels..."
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].state).toBe("success");
    expect(mockCreateCommitStatus.mock.calls[1][0].description).toBe(
      "No labels necessary for rapids-bot PRs"
    );
    expect(mockCreateCommitStatus.mock.calls[1][0].target_url).toBe(
      "https://docs.rapids.ai/resources/label-checker/"
    );
  });
});
