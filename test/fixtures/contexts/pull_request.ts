import { makeContext } from "./base";
import { PRContext } from "../../../src/types";

type RespParams = {
  labels?: string[];
  user?: string;
  title?: string;
  baseDefaultBranch?: string;
  baseRef?: string;
};

export const makePRContext = ({
  labels = [],
  user = "",
  title = "",
  baseDefaultBranch = "",
  baseRef = "",
}: RespParams = {}): PRContext => {
  const payload = {
    action: "opened",
    issue: {
      number: 1,
      user: {
        login: "rapidsuser",
      },
    },
    repository: {
      name: "somerepo",
      owner: {
        login: "rapidsai",
      },
    },
    installation: {
      id: 2,
    },
    pull_request: {
      title,
      labels: labels.map((el) => ({ name: el })),
      head: {
        sha: "1234sha",
      },
      base: {
        ref: baseRef,
        repo: {
          name: "somerepo",
          default_branch: baseDefaultBranch,
          owner: {
            login: "rapidsai",
          },
        },
      },
      user: {
        login: user,
      },
    },
  };

  return (makeContext(payload, "pull_request") as unknown) as PRContext;
};
