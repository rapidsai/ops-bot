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

export const validPRs = [
  makeResponse(),
  makeResponse({
    title: "Some Doc PR",
    labels: ["doc"],
    number: 456,
    login: "ajschmidt8",
  }),
];
export const PRMissingLabels = makeResponse({
  title: "Another Title",
  number: 4567,
  labels: [],
});
