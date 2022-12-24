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

import { makePRContext } from "./fixtures/contexts/pull_request";
import { mockConfigGet, mockContextRepo } from "./mocks";
import { default as repoResp } from "./fixtures/responses/context_repo.json";
import { makeConfigReponse } from "./fixtures/responses/get_config";
import { OpsBotPlugin } from "../src/plugin";

const context = makePRContext();
mockContextRepo.mockReturnValue(repoResp);

describe("Config Checker", () => {
  beforeEach(() => {
    mockConfigGet.mockReset();
  });

  test.each([
    { isEnabled: true, expectedResult: false },
    { isEnabled: false, expectedResult: true },
  ])("label_checker: $isEnabled", async ({ isEnabled, expectedResult }) => {
    mockConfigGet.mockResolvedValueOnce(
      makeConfigReponse({ label_checker: isEnabled })
    );

    class TestClass extends OpsBotPlugin {
      constructor(context) {
        super("label_checker", context);
      }
    }

    const result = await new TestClass(context).pluginIsDisabled();
    expect(result).toBe(expectedResult);
  });
});
