import nock, { Scope } from "nock";
import { mockToken } from "../util";

export const mockResponses = (
  nockObj: typeof nock,
  state: "success" | "failure",
  description: string
): Scope => {
  return mockToken(nockObj)
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
      expect(body).toMatchObject({
        state,
        context: "Label Checker",
        description,
      });
      return true;
    })
    .reply(200);
};
