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

import { makeContext } from "./base";
import { PRContext } from "../../../src/types";

type RespParams = {
  labels?: string[];
  user?: string;
  title?: string;
  baseDefaultBranch?: string;
  baseRef?: string;
  action?: string;
  senderName?: string;
};

export const makePRContext = ({
  labels = [],
  user = "",
  title = "",
  baseDefaultBranch = "",
  baseRef = "",
  action = "opened",
  senderName = ""
}: RespParams = {}): PRContext => {
  const payload = {
    action,
    issue: {
      number: 1,
      user: {
        login: "rapidsuser",
      },
    },
    repository: {
      name: "somerepo",
      owner: {
        login: "rapidsai",
      },
    },
    installation: {
      id: 2,
    },
    pull_request: {
      title,
      labels: labels.map((el) => ({ name: el })),
      head: {
        sha: "1234sha",
      },
      base: {
        ref: baseRef,
        repo: {
          name: "somerepo",
          default_branch: baseDefaultBranch,
          owner: {
            login: "rapidsai",
          },
        },
      },
      user: {
        login: user,
      },
    },
    sender: {
      login: senderName
    }
  };

  return (makeContext(payload, "pull_request") as unknown) as PRContext;
};
