type RespParams = {
  id?: number;
  draft?: boolean;
  name?: string;
};

const makeResponse = ({
  id = 1,
  draft = true,
  name = "v0.17.0",
}: RespParams = {}) => ({
  data: [
    {
      id,
      draft,
      name,
    },
    {
      id: 78,
      draft: false,
      name: "some random release",
    },
  ],
});

export const hasExistingRelease = makeResponse();
export const hasNoExistingRelease = makeResponse({ name: "random name" });
