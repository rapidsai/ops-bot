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
import { PRReviewContext } from "../../../src/types.ts";
type RespParams = {
  state?: string;
};

const makePRReviewContext = ({
  state = "commented",
}: RespParams = {}): PRReviewContext => {
  const payload = {
    pull_request: {
      number: 798,
    },
    review: {
      state,
    },
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      owner: {
        login: "rapidsai",
      },
    },
  };

  return (makeContext(
    payload,
    "pull_request_review.submitted"
  ) as unknown) as PRReviewContext;
};

export const commented = makePRReviewContext();
