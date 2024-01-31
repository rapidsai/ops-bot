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

import {
  mockCompareCommitsWithBasehead,
  mockConfigGet,
  mockContextRepo,
  mockCreateComment,
  mockCreateCommitStatus,
  mockCreateRelease,
  mockGetByUsername,
  mockGetRef,
  mockGetReleaseByTag,
  mockGetUserPermissionLevel,
  mockListComments,
  mockListCommits,
  mockSearchIssuesAndPullRequests,
  mockListPulls,
  mockListReviews,
  mockLogger,
  mockMerge,
  mockPaginate,
  mockPullsGet,
  mockUpdateRelease,
  mockCreatePR,
  mockListBranches,
} from "../../mocks";
import type { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types";

export const makeContext = (payload, name: EmitterWebhookEventName) => {
  return {
    name,
    payload,
    repo: mockContextRepo,
    log: {
      ...mockLogger,
      child: () => mockLogger,
    },
    octokit: {
      issues: {
        listComments: mockListComments,
        createComment: mockCreateComment,
      },
      pulls: {
        get: mockPullsGet,
        list: mockListPulls,
        listReviews: mockListReviews,
        merge: mockMerge,
        create: mockCreatePR,
      },
      repos: {
        createCommitStatus: mockCreateCommitStatus,
        createRelease: mockCreateRelease,
        getCollaboratorPermissionLevel: mockGetUserPermissionLevel,
        listCommits: mockListCommits,
        getReleaseByTag: mockGetReleaseByTag,
        updateRelease: mockUpdateRelease,
        compareCommitsWithBasehead: mockCompareCommitsWithBasehead,
        listBranches: mockListBranches,
      },
      users: {
        getByUsername: mockGetByUsername,
      },
      paginate: mockPaginate,
      config: {
        get: mockConfigGet,
      },
      rest: {
        git: {
          getRef: mockGetRef,
        },
      },
      search: {
        issuesAndPullRequests: mockSearchIssuesAndPullRequests,
      },
    },
  };
};
