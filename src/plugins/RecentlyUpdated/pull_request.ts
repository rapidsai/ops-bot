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
import { PRContext } from "../../types";
import { checkPR } from "./check_pr";

export class PRRecentlyUpdated extends OpsBotPlugin {
  public context: PRContext;

  constructor(context: PRContext) {
    super("recently_updated", context);
    this.context = context;
  }

  async checkPR() {
    const { context } = this;
    if (await this.pluginIsDisabled()) return;
    const bound = checkPR.bind(this);
    await bound(
      context,
      context.payload.pull_request,
      await this.getConfigValue("recently_updated_threshold")
    );
  }
}
