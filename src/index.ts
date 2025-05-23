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
import { initAutoMerger } from "./plugins/AutoMerger/index.ts";
import { initBranchChecker } from "./plugins/BranchChecker/index.ts";
import { initLabelChecker } from "./plugins/LabelChecker/index.ts";
import { initRecentlyUpdated } from "./plugins/RecentlyUpdated/index.ts";
import { initReleaseDrafter } from "./plugins/ReleaseDrafter/index.ts";
import { initForwardMerger } from "./plugins/ForwardMerger/index.ts";

export default (app: Probot) => {
  initBranchChecker(app);
  initLabelChecker(app);
  initReleaseDrafter(app);
  initAutoMerger(app);
  initRecentlyUpdated(app);
  initForwardMerger(app);
};
