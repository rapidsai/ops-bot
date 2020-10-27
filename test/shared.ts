import { Probot, ProbotOctokit } from "probot";
const fs = require("fs");
const path = require("path");

const privateKey = fs.readFileSync(
  path.join(__dirname, "fixtures/mock-cert.pem"),
  "utf-8"
);

export const getProbot = () =>
  new Probot({
    id: 123,
    privateKey,
    // disable request throttling and retries for testing
    Octokit: ProbotOctokit.defaults({
      retry: { enabled: false },
      throttle: { enabled: false },
    }),
  });

export const mockToken = (nock) =>
  nock("https://api.github.com")
    .post("/app/installations/2/access_tokens")
    .reply(200, {
      token: "test",
      permissions: {
        issues: "write",
      },
    });
