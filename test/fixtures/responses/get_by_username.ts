type RespParams = {
  name?: string;
  login?: string;
};

const makeResponse = ({ name = "", login = "VibhuJawa" }: RespParams = {}) => ({
  data: {
    name,
    login,
    html_url: `https://github.com/${login}`,
  },
});

export const user = makeResponse({ name: "Keith Kraus", login: "kkraus14" });
export const userNoName = makeResponse();
