import { makeContext } from "./base";
import { PRContext } from "../../../src/types";

type RespParams = {
  labels?: string[];
  user?: string;
  title?: string;
};

const makePRContext = ({
  labels = [],
  user = "",
  title = "",
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
      user: {
        login: user,
      },
    },
  };

  return (makeContext(payload, "pull_request") as unknown) as PRContext;
};

// Missing category & breaking labels
export const noLabels = makePRContext();

// Missing breaking label
export const noBreakingOneCat = makePRContext({ labels: ["bug"] });

// Missing category label
export const noCatOneBreaking = makePRContext({ labels: ["breaking"] });

// Too many breaking labels applied
export const manyBreakingOneCat = makePRContext({
  labels: ["breaking", "non-breaking", "bug"],
});

// Too many category labels applied
export const manyCatOneBreaking = makePRContext({
  labels: ["bug", "improvement", "breaking"],
});

// Missing category label & too many breaking labels applied
export const manyBreakingNoCat = makePRContext({
  labels: ["non-breaking", "breaking"],
});

// Too many category & breaking labels applied
export const manyCatManyBreaking = makePRContext({
  labels: ["bug", "improvement", "breaking", "non-breaking"],
});

// Missing breaking label & too many category labels applied
export const noBreakingManyCat = makePRContext({
  labels: ["bug", "improvement"],
});

// Correct labels applied
export const correctLabels = makePRContext({ labels: ["bug", "breaking"] });

// GPUtester - No labels necessary for forward-merging PRs
export const gpuTester = makePRContext({
  labels: ["bug", "breaking"],
  title: "[gpuCI] Auto-merge branch-0.18 to branch-0.19 [skip ci]",
  user: "GPUtester",
});
