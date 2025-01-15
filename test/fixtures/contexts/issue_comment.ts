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
import { IssueCommentContext } from "../../../src/types.ts";
type RespParams = {
  is_pr?: boolean;
  is_private?: boolean;
  body?: string;
  commentUsername?: string;
  issueUsername?: string;
};

export const makeIssueCommentContext = ({
  is_pr = false,
  is_private = false,
  body = "some random text",
  commentUsername = "someone",
  issueUsername = "issue_user",
}: RespParams = {}): IssueCommentContext => {
  const payload = {
    issue: {
      number: 468,
      user: {
        login: issueUsername,
      },
    },
    comment: {
      body: body,
      user: {
        login: commentUsername,
      },
    },
    repository: {
      name: "cudf",
      full_name: "rapidsai/cudf",
      private: is_private,
      owner: {
        login: "rapidsai",
      },
    },
  };

  if (is_pr) payload.issue["pull_request"] = {};

  return makeContext(
    payload,
    "issue_comment.created"
  ) as unknown as IssueCommentContext;
};

export const nonPrComment = makeIssueCommentContext({ is_pr: false });
export const prCommentNoMerge = makeIssueCommentContext({ is_pr: true });
