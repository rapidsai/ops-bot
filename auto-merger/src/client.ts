import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { createAppAuth } from "@octokit/auth-app";

const privateKey = process.env.PRIVATE_KEY || "test_key";

const buff = Buffer.from(privateKey, "base64");

const MyOctokit = Octokit.plugin(throttling).defaults({
  per_page: 100,
});

export const getClient = () => {
  return new MyOctokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.APP_ID,
      privateKey: buff.toString("ascii"),
      installationId: 12543261,
    },
    throttle: {
      onRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );
        octokit.log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      },
      onAbuseLimit: (retryAfter, options, octokit) => {
        // does not retry, only logs a warning
        octokit.log.warn(
          `Abuse detected for request ${options.method} ${options.url}`
        );
        octokit.log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      },
    },
  });
};
