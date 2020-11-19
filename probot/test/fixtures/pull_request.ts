const base = (labels: string[] = []) => ({
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
    labels: labels.map((el) => ({ name: el })),
    head: {
      sha: "1234sha",
    },
  },
});

// "Missing category & breaking labels",
export const noLabels = base();

// "Missing breaking label",
export const noBreakingOneCat = base(["bug"]);

// "Missing category label",
export const noCatOneBreaking = base(["breaking"]);

// "Too many breaking labels applied",
export const manyBreakingOneCat = base(["breaking", "non-breaking", "bug"]);

// "Too many category labels applied",
export const manyCatOneBreaking = base(["bug", "improvement", "breaking"]);

// "Missing category label & too many breaking labels applied",
export const manyBreakingNoCat = base(["non-breaking", "breaking"]);

// "Too many category & breaking labels applied",
export const manyCatManyBreaking = base([
  "bug",
  "improvement",
  "breaking",
  "non-breaking",
]);

// "Missing breaking label & too many category labels applied",
export const noBreakingManyCat = base(["bug", "improvement"]);

// "Correct labels applied",
export const correctLabels = base(["bug", "breaking"]);
