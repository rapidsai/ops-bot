import { PRContext } from "../../src/types";
import * as prPayload from "./pull_request";

const mockCompareCommits = jest.fn();
const mockCreateCommitStatus = jest.fn();
const mockCreateRelease = jest.fn();
const mockListCommits = jest.fn();
const mockListPullRequestsAssociatedWithCommit = jest.fn();
const mockListReleases = jest.fn();
const mockUpdateRelease = jest.fn();

const makeContext = (payload) => {
  return {
    payload,
    github: {
      repos: {
        compareCommits: mockCompareCommits,
        createCommitStatus: mockCreateCommitStatus,
        createRelease: mockCreateRelease,
        listCommits: mockListCommits,
        listPullRequestsAssociatedWithCommit: mockListPullRequestsAssociatedWithCommit,
        listReleases: mockListReleases,
        updateRelease: mockUpdateRelease,
      },
    },
  };
};

const makePRContext = (payload): PRContext => {
  return (makeContext(payload) as unknown) as PRContext;
};

export const mocks = {
  mockCompareCommits,
  mockCreateCommitStatus,
  mockCreateRelease,
  mockListCommits,
  mockListPullRequestsAssociatedWithCommit,
  mockListReleases,
  mockUpdateRelease,
};

export const pulls = {
  noLabels: makePRContext(prPayload.noLabels),
  noBreakingOneCat: makePRContext(prPayload.noBreakingOneCat),
  noCatOneBreaking: makePRContext(prPayload.noCatOneBreaking),
  manyBreakingOneCat: makePRContext(prPayload.manyBreakingOneCat),
  manyCatOneBreaking: makePRContext(prPayload.manyCatOneBreaking),
  manyBreakingNoCat: makePRContext(prPayload.manyBreakingNoCat),
  manyCatManyBreaking: makePRContext(prPayload.manyCatManyBreaking),
  noBreakingManyCat: makePRContext(prPayload.noBreakingManyCat),
  correctLabels: makePRContext(prPayload.correctLabels),
};

// Probot plugins usage
// context.payload
// context.payload.ref
// context.payload.repository.name
// context.payload.after
// context.payload.repository.owner.login
// context.payload.pull_request.labels
// context.payload.pull_request.head.sha
