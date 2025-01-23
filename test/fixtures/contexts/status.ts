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

import { makeContext } from "./base.ts";
import { StatusContext } from "../../../src/types.ts";

const makeStatusContext = (state: string = "success"): StatusContext => {
  const payload = {
    state,
    sha: "somerandomsha1234",
    commit: {
      author: {
        login: "codereport",
      },
    },
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      owner: {
        login: "rapidsai",
      },
    },
  };

  return (makeContext(payload, "status") as unknown) as StatusContext;
};

export const successStatus = makeStatusContext();
