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

import { Probot } from "probot";
import { PRBranchChecker } from "./pull_request";
import { RepositoryBranchChecker } from "./repository";

export const initBranchChecker = (app: Probot) => {
  app.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.edited",
      "pull_request.synchronize",
    ],
    async (context) => {
      await new PRBranchChecker(context).checkPR();
    }
  );
  app.on("repository.edited", async (context) => {
    await new RepositoryBranchChecker(context).checkAllPRs();
  });
};
