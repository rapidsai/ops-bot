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

export const mockCheckMembershipForUser = jest
  .fn()
  .mockName("mockCheckMembershipForUser");
export const mockCompareCommitsWithBasehead = jest
  .fn()
  .mockName("mockCompareCommitsWithBasehead");
export const mockConfigGet = jest.fn().mockName("mockConfigGet");
export const mockContextRepo = jest.fn().mockName("mockContextRepo");
export const mockCreateComment = jest.fn().mockName("mockCreateComment");
export const mockCreateCommitStatus = jest
  .fn()
  .mockName("mockCreateCommitStatus");
export const mockCreateRef = jest.fn().mockName("mockCreateRef");
export const mockCreateRelease = jest.fn().mockName("mockCreateRelease");
export const mockDeleteRef = jest.fn().mockName("mockDeleteRef");
export const mockGetByUsername = jest.fn().mockName("mockGetByUsername");
export const mockGetRef = jest.fn().mockName("mockGetRef");
export const mockGetReleaseByTag = jest.fn().mockName("mockGetReleaseByTag");
export const mockGetUserPermissionLevel = jest
  .fn()
  .mockName("mockGetUserPermissionLevel");
export const mockListComments = jest.fn().mockName("mockListComments");
export const mockListCommits = jest.fn().mockName("mockListCommits");
export const mockListPullRequestsFromCommit = jest
  .fn()
  .mockName("mockListPullRequestsFromCommit");
export const mockListPulls = jest.fn().mockName("mockListPulls");
export const mockListReviews = jest.fn().mockName("mockListReviews");
export const mockLogger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
};
export const mockMerge = jest.fn().mockName("mockMerge");
export const mockPaginate = jest.fn().mockName("mockPaginate");
export const mockPullsGet = jest.fn().mockName("mockPullsGet");
export const mockUpdateRef = jest.fn().mockName("mockUpdateRef");
export const mockUpdateRelease = jest.fn().mockName("mockUpdateRelease");
