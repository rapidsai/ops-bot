import { makeContext } from "./base";
import { PushContext } from "../../../src/types";

type PushPayload = {
  ref?: string;
  created?: boolean;
  deleted?: boolean;
  default_branch?: string;
};

const makePushContext = ({
  ref = "branch-0.17",
  created = false,
  deleted = false,
  default_branch = "branch-0.17",
}: PushPayload = {}): PushContext => {
  const payload = {
    ref,
    before: "6113728f27ae82c7b1a177c8d03f9e96e0adf246",
    after: "c48f35a",
    created,
    deleted,
    forced: false,
    base_ref: null,
    compare:
      "https://github.com/Codertocat/Hello-World/compare/6113728f27ae...000000000000",
    commits: [],
    head_commit: null,
    repository: {
      id: 186853002,
      node_id: "MDEwOlJlcG9zaXRvcnkxODY4NTMwMDI=",
      name: "Hello-World",
      full_name: "Codertocat/Hello-World",
      private: false,
      owner: {
        name: "Codertocat",
        email: "21031067+Codertocat@users.noreply.github.com",
        login: "Codertocat",
        id: 21031067,
        node_id: "MDQ6VXNlcjIxMDMxMDY3",
        avatar_url: "https://avatars1.githubusercontent.com/u/21031067?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/Codertocat",
        html_url: "https://github.com/Codertocat",
        followers_url: "https://api.github.com/users/Codertocat/followers",
        following_url:
          "https://api.github.com/users/Codertocat/following{/other_user}",
        gists_url: "https://api.github.com/users/Codertocat/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/Codertocat/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/Codertocat/subscriptions",
        organizations_url: "https://api.github.com/users/Codertocat/orgs",
        repos_url: "https://api.github.com/users/Codertocat/repos",
        events_url: "https://api.github.com/users/Codertocat/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/Codertocat/received_events",
        type: "User",
        site_admin: false,
      },
      html_url: "https://github.com/Codertocat/Hello-World",
      description: null,
      fork: false,
      created_at: 1557933565,
      updated_at: "2019-05-15T15:20:41Z",
      pushed_at: 1557933657,
      homepage: null,
      size: 0,
      stargazers_count: 0,
      watchers_count: 0,
      language: "Ruby",
      has_issues: true,
      has_projects: true,
      has_downloads: true,
      has_wiki: true,
      has_pages: true,
      forks_count: 1,
      mirror_url: null,
      archived: false,
      disabled: false,
      open_issues_count: 2,
      license: null,
      forks: 1,
      open_issues: 2,
      watchers: 0,
      default_branch,
      stargazers: 0,
      master_branch: "master",
    },
    pusher: {
      name: "Codertocat",
      email: "21031067+Codertocat@users.noreply.github.com",
    },
    sender: {
      login: "Codertocat",
      id: 21031067,
      node_id: "MDQ6VXNlcjIxMDMxMDY3",
      avatar_url: "https://avatars1.githubusercontent.com/u/21031067?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/Codertocat",
      html_url: "https://github.com/Codertocat",
      followers_url: "https://api.github.com/users/Codertocat/followers",
      following_url:
        "https://api.github.com/users/Codertocat/following{/other_user}",
      gists_url: "https://api.github.com/users/Codertocat/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/Codertocat/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/Codertocat/subscriptions",
      organizations_url: "https://api.github.com/users/Codertocat/orgs",
      repos_url: "https://api.github.com/users/Codertocat/repos",
      events_url: "https://api.github.com/users/Codertocat/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/Codertocat/received_events",
      type: "User",
      site_admin: false,
    },
  };

  return (makeContext(payload, "push") as unknown) as PushContext;
};

export const validBranch = makePushContext();
export const invalidVersionedBranch = makePushContext({
  default_branch: "branch-0.13",
});
export const nonVersionedBranch = makePushContext({ ref: "main" });
export const createdPush = makePushContext({ created: true });
export const deletedPush = makePushContext({ deleted: true });
