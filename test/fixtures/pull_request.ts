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

export const no_labels = base();
export const correct_labels = base(["bug"]);
export const extra_labels = base(["bug", "enhancement"]);
