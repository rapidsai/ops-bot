import nock from "nock";
import myProbotApp from "../../src";
import * as payload from "../fixtures/pull_request";
import { getProbot } from "../util";
import { mockResponses } from "./util";

describe("Label Check", () => {
  let probot: any;

  beforeEach(() => {
    nock.disableNetConnect();
    probot = getProbot();
    probot.load(myProbotApp);
  });

  test("no labels", async () => {
    const mock = mockResponses(
      nock,
      "failure",
      "Missing category & breaking labels"
    );
    await probot.receive({
      name: "pull_request.opened",
      payload: payload.noLabels,
    });
    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("no breaking, one category", async () => {
    const mock = mockResponses(nock, "failure", "Missing breaking label");

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.noBreakingOneCat,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("no category, one breaking", async () => {
    const mock = mockResponses(nock, "failure", "Missing category label");

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.noCatOneBreaking,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("many breaking, one category", async () => {
    const mock = mockResponses(
      nock,
      "failure",
      "Too many breaking labels applied"
    );

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.manyBreakingOneCat,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("many category, one breaking", async () => {
    const mock = mockResponses(
      nock,
      "failure",
      "Too many category labels applied"
    );

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.manyCatOneBreaking,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("many breaking, no category", async () => {
    const mock = mockResponses(
      nock,
      "failure",
      "Missing category label & too many breaking labels applied"
    );

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.manyBreakingNoCat,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("many category, many breaking", async () => {
    const mock = mockResponses(
      nock,
      "failure",
      "Too many category & breaking labels applied"
    );

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.manyCatManyBreaking,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("no breaking, many category", async () => {
    const mock = mockResponses(
      nock,
      "failure",
      "Missing breaking label & too many category labels applied"
    );

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.noBreakingManyCat,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test("correct labels", async () => {
    const mock = mockResponses(nock, "success", "Correct labels applied");

    await probot.receive({
      name: "pull_request.opened",
      payload: payload.correctLabels,
    });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
