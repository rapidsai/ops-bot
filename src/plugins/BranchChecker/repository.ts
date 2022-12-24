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

import { OpsBotPlugin } from "../../plugin";
import { RepositoryContext } from "../../types";
import { checkPR } from "./check_pr";

export class RepositoryBranchChecker extends OpsBotPlugin {
  context: RepositoryContext;

  constructor(context: RepositoryContext) {
    super("branch_checker", context);
    this.context = context;
  }

  async checkAllPRs() {
    const { context } = this;
    if (await this.pluginIsDisabled()) return;
    const repo = context.payload.repository;

    const prs = await context.octokit.paginate(context.octokit.pulls.list, {
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100,
    });

    await Promise.all(prs.map((pr) => checkPR(context, pr)));
  }
}
