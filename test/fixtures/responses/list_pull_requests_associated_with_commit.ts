type ListResponse = {
  number?: number;
  title?: string;
  login?: string;
  labels?: string[];
};

const makeResponse = ({
  title = "[WIP] [skip-ci] Some PR title",
  number = 1234,
  labels = ["breaking", "bug"],
  login = "octokit",
}: ListResponse = {}) => ({
  data: [
    {
      number,
      title,
      user: {
        login,
      },
      labels: labels.map((el) => ({ name: el })),
    },
  ],
});

export const commitPRs = makeResponse();
