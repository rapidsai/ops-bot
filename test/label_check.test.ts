import nock from "nock";
import myProbotApp from "../src";
import * as payload from "./fixtures/pull_request";
import { mockToken, getProbot } from "./shared";

describe("Label Check", () => {
  let probot: any;
  const eventTriggers = [
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.labeled",
    "pull_request.unlabeled",
    "pull_request.synchronize",
  ];

  beforeEach(() => {
    nock.disableNetConnect();
    probot = getProbot();
    probot.load(myProbotApp);
  });

  test.each(eventTriggers)(
    "%s - correct labels",
    async (trigger, done: any) => {
      const mock = mockToken(nock)
        .post("/repos/rapidsai/somerepo/statuses/1234sha", (body: any) => {
          expect(body).toMatchObject({
            state: "pending",
            context: "Label Checker",
            description: "Checking labels...",
          });
          return true;
        })
        .reply(200)
        .post("/repos/rapidsai/somerepo/statuses/1234sha", (body: any) => {
          done(
            expect(body).toMatchObject({
              state: "success",
              context: "Label Checker",
              description: "Correct labels applied",
            })
          );
          return true;
        })
        .reply(200);

      await probot.receive({ name: trigger, payload: payload.correct_labels });

      expect(mock.pendingMocks()).toStrictEqual([]);
    }
  );

  test.each(eventTriggers)("%s - extra labels", async (trigger, done: any) => {
    const mock = mockToken(nock)
      .post("/repos/rapidsai/somerepo/statuses/1234sha", (body: any) => {
        expect(body).toMatchObject({
          state: "pending",
          context: "Label Checker",
          description: "Checking labels...",
        });
        return true;
      })
      .reply(200)
      .post("/repos/rapidsai/somerepo/statuses/1234sha", (body: any) => {
        done(
          expect(body).toMatchObject({
            state: "failure",
            context: "Label Checker",
            description: "Too many labels applied",
          })
        );
        return true;
      })
      .reply(200);

    await probot.receive({ name: trigger, payload: payload.extra_labels });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  test.each(eventTriggers)("%s - no labels", async (trigger, done: any) => {
    const mock = mockToken(nock)
      .post("/repos/rapidsai/somerepo/statuses/1234sha", (body: any) => {
        expect(body).toMatchObject({
          state: "pending",
          context: "Label Checker",
          description: "Checking labels...",
        });
        return true;
      })
      .reply(200)
      .post("/repos/rapidsai/somerepo/statuses/1234sha", (body: any) => {
        done(
          expect(body).toMatchObject({
            state: "failure",
            context: "Label Checker",
            description: "No labels applied",
          })
        );
        return true;
      })
      .reply(200);

    await probot.receive({ name: trigger, payload: payload.no_labels });

    expect(mock.pendingMocks()).toStrictEqual([]);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
});
