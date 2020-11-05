type PullRequest = {
  mergeable?: boolean;
  mergeable_state?: string;
  base_default_branch?: string;
};

const base = ({
  mergeable = true,
  mergeable_state = "clean",
  base_default_branch = "branch-0.17",
}: PullRequest = {}) => ({
  url: "https://api.github.com/repos/rapidsai/cudf/pulls/6609",
  id: 511241437,
  node_id: "MDExOlB1bGxSZXF1ZXN0NTExMjQxNDM3",
  html_url: "https://github.com/rapidsai/cudf/pull/6609",
  diff_url: "https://github.com/rapidsai/cudf/pull/6609.diff",
  patch_url: "https://github.com/rapidsai/cudf/pull/6609.patch",
  issue_url: "https://api.github.com/repos/rapidsai/cudf/issues/6609",
  number: 6609,
  state: "open",
  locked: false,
  title: "[REVIEW] Support fixed-point decimal for HostColumnVector [skip ci]",
  user: {
    login: "sperlingxx",
    id: 6276118,
    node_id: "MDQ6VXNlcjYyNzYxMTg=",
    avatar_url: "https://avatars3.githubusercontent.com/u/6276118?v=4",
    gravatar_id: "",
    url: "https://api.github.com/users/sperlingxx",
    html_url: "https://github.com/sperlingxx",
    followers_url: "https://api.github.com/users/sperlingxx/followers",
    following_url:
      "https://api.github.com/users/sperlingxx/following{/other_user}",
    gists_url: "https://api.github.com/users/sperlingxx/gists{/gist_id}",
    starred_url:
      "https://api.github.com/users/sperlingxx/starred{/owner}{/repo}",
    subscriptions_url: "https://api.github.com/users/sperlingxx/subscriptions",
    organizations_url: "https://api.github.com/users/sperlingxx/orgs",
    repos_url: "https://api.github.com/users/sperlingxx/repos",
    events_url: "https://api.github.com/users/sperlingxx/events{/privacy}",
    received_events_url:
      "https://api.github.com/users/sperlingxx/received_events",
    type: "User",
    site_admin: false,
  },
  body:
    "This is the PR body. \r\n\r\n<!--\r\n\r\nThank you for contributing to cuDF :)\r\n\r\nHere are some guidelines to help the review process go smoothly.\r\n\r\n1. Please write a description in this text box of the changes that are being\r\n   made.\r\n\r\n2. Please ensure that you have written units tests for the changes made/features\r\n   added.\r\n\r\n3. There are CI checks in place to enforce that committed code follows our style\r\n   and syntax standards. Please see our contribution guide in `CONTRIBUTING.MD`\r\n   in the project root for more information about the checks we perform and how\r\n   you can run them locally.\r\n\r\n4. If you are closing an issue please use one of the automatic closing words as\r\n   noted here: https://help.github.com/articles/closing-issues-using-keywords/\r\n\r\n5. If your pull request is not ready for review but you want to make use of the\r\n   continuous integration testing facilities please label it with `[WIP]`.\r\n\r\n6. If your pull request is ready to be reviewed without requiring additional\r\n   work on top of it, then remove the `[WIP]` label (if present) and replace\r\n   it with `[REVIEW]`. If assistance is required to complete the functionality,\r\n   for example when the C/C++ code of a feature is complete but Python bindings\r\n   are still required, then add the label `[HELP-REQ]` so that others can triage\r\n   and assist. The additional changes then can be implemented on top of the\r\n   same PR. If the assistance is done by members of the rapidsAI team, then no\r\n   additional actions are required by the creator of the original PR for this,\r\n   otherwise the original author of the PR needs to give permission to the\r\n   person(s) assisting to commit to their personal fork of the project. If that\r\n   doesn't happen then a new PR based on the code of the original PR can be\r\n   opened by the person assisting, which then will be the PR that will be\r\n   merged.\r\n\r\n7. Once all work has been done and review has taken place please do not add\r\n   features or make changes out of the scope of those requested by the reviewer\r\n   (doing this just add delays as already reviewed code ends up having to be\r\n   re-reviewed/it is hard to tell what is new etc!). Further, please do not\r\n   rebase your branch on master/force push/rewrite history, doing any of these\r\n   causes the context of any comments made by reviewers to be lost. If\r\n   conflicts occur against master they should be resolved by merging master\r\n   into the branch used for making the pull request.\r\n\r\nMany thanks in advance for your cooperation!\r\n\r\n-->\r\n",
  created_at: "2020-10-28T03:00:37Z",
  updated_at: "2020-10-29T09:03:36Z",
  closed_at: null,
  merged_at: null,
  merge_commit_sha: "1d31390e36173164a06ed915b7dba0678d58416e",
  assignee: null,
  assignees: [],
  requested_reviewers: [
    {
      login: "revans2",
      id: 3441321,
      node_id: "MDQ6VXNlcjM0NDEzMjE=",
      avatar_url: "https://avatars0.githubusercontent.com/u/3441321?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/revans2",
      html_url: "https://github.com/revans2",
      followers_url: "https://api.github.com/users/revans2/followers",
      following_url:
        "https://api.github.com/users/revans2/following{/other_user}",
      gists_url: "https://api.github.com/users/revans2/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/revans2/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/revans2/subscriptions",
      organizations_url: "https://api.github.com/users/revans2/orgs",
      repos_url: "https://api.github.com/users/revans2/repos",
      events_url: "https://api.github.com/users/revans2/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/revans2/received_events",
      type: "User",
      site_admin: false,
    },
    {
      login: "nartal1",
      id: 50492963,
      node_id: "MDQ6VXNlcjUwNDkyOTYz",
      avatar_url: "https://avatars2.githubusercontent.com/u/50492963?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/nartal1",
      html_url: "https://github.com/nartal1",
      followers_url: "https://api.github.com/users/nartal1/followers",
      following_url:
        "https://api.github.com/users/nartal1/following{/other_user}",
      gists_url: "https://api.github.com/users/nartal1/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/nartal1/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/nartal1/subscriptions",
      organizations_url: "https://api.github.com/users/nartal1/orgs",
      repos_url: "https://api.github.com/users/nartal1/repos",
      events_url: "https://api.github.com/users/nartal1/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/nartal1/received_events",
      type: "User",
      site_admin: false,
    },
  ],
  requested_teams: [],
  labels: [
    {
      id: 1405145623,
      node_id: "MDU6TGFiZWwxNDA1MTQ1NjIz",
      url: "https://api.github.com/repos/rapidsai/cudf/labels/cuDF%20(Java)",
      name: "cuDF (Java)",
      color: "006b75",
      default: false,
      description: "Affects Java cuDF API.",
    },
  ],
  milestone: null,
  draft: false,
  commits_url: "https://api.github.com/repos/rapidsai/cudf/pulls/6609/commits",
  review_comments_url:
    "https://api.github.com/repos/rapidsai/cudf/pulls/6609/comments",
  review_comment_url:
    "https://api.github.com/repos/rapidsai/cudf/pulls/comments{/number}",
  comments_url:
    "https://api.github.com/repos/rapidsai/cudf/issues/6609/comments",
  statuses_url:
    "https://api.github.com/repos/rapidsai/cudf/statuses/f877b90d5862b0567801f251f36603b99b62cd4b",
  head: {
    label: "sperlingxx:dec_hostcv",
    ref: "dec_hostcv",
    sha: "f877b90d5862b0567801f251f36603b99b62cd4b",
    user: {
      login: "sperlingxx",
      id: 6276118,
      node_id: "MDQ6VXNlcjYyNzYxMTg=",
      avatar_url: "https://avatars3.githubusercontent.com/u/6276118?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/sperlingxx",
      html_url: "https://github.com/sperlingxx",
      followers_url: "https://api.github.com/users/sperlingxx/followers",
      following_url:
        "https://api.github.com/users/sperlingxx/following{/other_user}",
      gists_url: "https://api.github.com/users/sperlingxx/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/sperlingxx/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/sperlingxx/subscriptions",
      organizations_url: "https://api.github.com/users/sperlingxx/orgs",
      repos_url: "https://api.github.com/users/sperlingxx/repos",
      events_url: "https://api.github.com/users/sperlingxx/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/sperlingxx/received_events",
      type: "User",
      site_admin: false,
    },
    repo: {
      id: 297335073,
      node_id: "MDEwOlJlcG9zaXRvcnkyOTczMzUwNzM=",
      name: "cudf",
      full_name: "sperlingxx/cudf",
      private: false,
      owner: {
        login: "sperlingxx",
        id: 6276118,
        node_id: "MDQ6VXNlcjYyNzYxMTg=",
        avatar_url: "https://avatars3.githubusercontent.com/u/6276118?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/sperlingxx",
        html_url: "https://github.com/sperlingxx",
        followers_url: "https://api.github.com/users/sperlingxx/followers",
        following_url:
          "https://api.github.com/users/sperlingxx/following{/other_user}",
        gists_url: "https://api.github.com/users/sperlingxx/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/sperlingxx/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/sperlingxx/subscriptions",
        organizations_url: "https://api.github.com/users/sperlingxx/orgs",
        repos_url: "https://api.github.com/users/sperlingxx/repos",
        events_url: "https://api.github.com/users/sperlingxx/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/sperlingxx/received_events",
        type: "User",
        site_admin: false,
      },
      html_url: "https://github.com/sperlingxx/cudf",
      description: "cuDF - GPU DataFrame Library",
      fork: true,
      url: "https://api.github.com/repos/sperlingxx/cudf",
      forks_url: "https://api.github.com/repos/sperlingxx/cudf/forks",
      keys_url: "https://api.github.com/repos/sperlingxx/cudf/keys{/key_id}",
      collaborators_url:
        "https://api.github.com/repos/sperlingxx/cudf/collaborators{/collaborator}",
      teams_url: "https://api.github.com/repos/sperlingxx/cudf/teams",
      hooks_url: "https://api.github.com/repos/sperlingxx/cudf/hooks",
      issue_events_url:
        "https://api.github.com/repos/sperlingxx/cudf/issues/events{/number}",
      events_url: "https://api.github.com/repos/sperlingxx/cudf/events",
      assignees_url:
        "https://api.github.com/repos/sperlingxx/cudf/assignees{/user}",
      branches_url:
        "https://api.github.com/repos/sperlingxx/cudf/branches{/branch}",
      tags_url: "https://api.github.com/repos/sperlingxx/cudf/tags",
      blobs_url: "https://api.github.com/repos/sperlingxx/cudf/git/blobs{/sha}",
      git_tags_url:
        "https://api.github.com/repos/sperlingxx/cudf/git/tags{/sha}",
      git_refs_url:
        "https://api.github.com/repos/sperlingxx/cudf/git/refs{/sha}",
      trees_url: "https://api.github.com/repos/sperlingxx/cudf/git/trees{/sha}",
      statuses_url:
        "https://api.github.com/repos/sperlingxx/cudf/statuses/{sha}",
      languages_url: "https://api.github.com/repos/sperlingxx/cudf/languages",
      stargazers_url: "https://api.github.com/repos/sperlingxx/cudf/stargazers",
      contributors_url:
        "https://api.github.com/repos/sperlingxx/cudf/contributors",
      subscribers_url:
        "https://api.github.com/repos/sperlingxx/cudf/subscribers",
      subscription_url:
        "https://api.github.com/repos/sperlingxx/cudf/subscription",
      commits_url: "https://api.github.com/repos/sperlingxx/cudf/commits{/sha}",
      git_commits_url:
        "https://api.github.com/repos/sperlingxx/cudf/git/commits{/sha}",
      comments_url:
        "https://api.github.com/repos/sperlingxx/cudf/comments{/number}",
      issue_comment_url:
        "https://api.github.com/repos/sperlingxx/cudf/issues/comments{/number}",
      contents_url:
        "https://api.github.com/repos/sperlingxx/cudf/contents/{+path}",
      compare_url:
        "https://api.github.com/repos/sperlingxx/cudf/compare/{base}...{head}",
      merges_url: "https://api.github.com/repos/sperlingxx/cudf/merges",
      archive_url:
        "https://api.github.com/repos/sperlingxx/cudf/{archive_format}{/ref}",
      downloads_url: "https://api.github.com/repos/sperlingxx/cudf/downloads",
      issues_url:
        "https://api.github.com/repos/sperlingxx/cudf/issues{/number}",
      pulls_url: "https://api.github.com/repos/sperlingxx/cudf/pulls{/number}",
      milestones_url:
        "https://api.github.com/repos/sperlingxx/cudf/milestones{/number}",
      notifications_url:
        "https://api.github.com/repos/sperlingxx/cudf/notifications{?since,all,participating}",
      labels_url: "https://api.github.com/repos/sperlingxx/cudf/labels{/name}",
      releases_url:
        "https://api.github.com/repos/sperlingxx/cudf/releases{/id}",
      deployments_url:
        "https://api.github.com/repos/sperlingxx/cudf/deployments",
      created_at: "2020-09-21T12:38:17Z",
      updated_at: "2020-09-30T03:19:20Z",
      pushed_at: "2020-10-29T09:03:21Z",
      git_url: "git://github.com/sperlingxx/cudf.git",
      ssh_url: "git@github.com:sperlingxx/cudf.git",
      clone_url: "https://github.com/sperlingxx/cudf.git",
      svn_url: "https://github.com/sperlingxx/cudf",
      homepage: "http://rapids.ai",
      size: 76676,
      stargazers_count: 0,
      watchers_count: 0,
      language: "C++",
      has_issues: false,
      has_projects: true,
      has_downloads: true,
      has_wiki: true,
      has_pages: false,
      forks_count: 0,
      mirror_url: null,
      archived: false,
      disabled: false,
      open_issues_count: 0,
      license: {
        key: "apache-2.0",
        name: "Apache License 2.0",
        spdx_id: "Apache-2.0",
        url: "https://api.github.com/licenses/apache-2.0",
        node_id: "MDc6TGljZW5zZTI=",
      },
      forks: 0,
      open_issues: 0,
      watchers: 0,
      default_branch: "branch-0.16",
    },
  },
  base: {
    label: "rapidsai:branch-0.17",
    ref: "branch-0.17",
    sha: "64bab8fec84db6e4250063268a8cac592d188888",
    user: {
      login: "rapidsai",
      id: 43887749,
      node_id: "MDEyOk9yZ2FuaXphdGlvbjQzODg3NzQ5",
      avatar_url: "https://avatars2.githubusercontent.com/u/43887749?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/rapidsai",
      html_url: "https://github.com/rapidsai",
      followers_url: "https://api.github.com/users/rapidsai/followers",
      following_url:
        "https://api.github.com/users/rapidsai/following{/other_user}",
      gists_url: "https://api.github.com/users/rapidsai/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/rapidsai/starred{/owner}{/repo}",
      subscriptions_url: "https://api.github.com/users/rapidsai/subscriptions",
      organizations_url: "https://api.github.com/users/rapidsai/orgs",
      repos_url: "https://api.github.com/users/rapidsai/repos",
      events_url: "https://api.github.com/users/rapidsai/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/rapidsai/received_events",
      type: "Organization",
      site_admin: false,
    },
    repo: {
      id: 90506918,
      node_id: "MDEwOlJlcG9zaXRvcnk5MDUwNjkxOA==",
      name: "cudf",
      full_name: "rapidsai/cudf",
      private: false,
      owner: {
        login: "rapidsai",
        id: 43887749,
        node_id: "MDEyOk9yZ2FuaXphdGlvbjQzODg3NzQ5",
        avatar_url: "https://avatars2.githubusercontent.com/u/43887749?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/rapidsai",
        html_url: "https://github.com/rapidsai",
        followers_url: "https://api.github.com/users/rapidsai/followers",
        following_url:
          "https://api.github.com/users/rapidsai/following{/other_user}",
        gists_url: "https://api.github.com/users/rapidsai/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/rapidsai/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/rapidsai/subscriptions",
        organizations_url: "https://api.github.com/users/rapidsai/orgs",
        repos_url: "https://api.github.com/users/rapidsai/repos",
        events_url: "https://api.github.com/users/rapidsai/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/rapidsai/received_events",
        type: "Organization",
        site_admin: false,
      },
      html_url: "https://github.com/rapidsai/cudf",
      description: "cuDF - GPU DataFrame Library",
      fork: false,
      url: "https://api.github.com/repos/rapidsai/cudf",
      forks_url: "https://api.github.com/repos/rapidsai/cudf/forks",
      keys_url: "https://api.github.com/repos/rapidsai/cudf/keys{/key_id}",
      collaborators_url:
        "https://api.github.com/repos/rapidsai/cudf/collaborators{/collaborator}",
      teams_url: "https://api.github.com/repos/rapidsai/cudf/teams",
      hooks_url: "https://api.github.com/repos/rapidsai/cudf/hooks",
      issue_events_url:
        "https://api.github.com/repos/rapidsai/cudf/issues/events{/number}",
      events_url: "https://api.github.com/repos/rapidsai/cudf/events",
      assignees_url:
        "https://api.github.com/repos/rapidsai/cudf/assignees{/user}",
      branches_url:
        "https://api.github.com/repos/rapidsai/cudf/branches{/branch}",
      tags_url: "https://api.github.com/repos/rapidsai/cudf/tags",
      blobs_url: "https://api.github.com/repos/rapidsai/cudf/git/blobs{/sha}",
      git_tags_url: "https://api.github.com/repos/rapidsai/cudf/git/tags{/sha}",
      git_refs_url: "https://api.github.com/repos/rapidsai/cudf/git/refs{/sha}",
      trees_url: "https://api.github.com/repos/rapidsai/cudf/git/trees{/sha}",
      statuses_url: "https://api.github.com/repos/rapidsai/cudf/statuses/{sha}",
      languages_url: "https://api.github.com/repos/rapidsai/cudf/languages",
      stargazers_url: "https://api.github.com/repos/rapidsai/cudf/stargazers",
      contributors_url:
        "https://api.github.com/repos/rapidsai/cudf/contributors",
      subscribers_url: "https://api.github.com/repos/rapidsai/cudf/subscribers",
      subscription_url:
        "https://api.github.com/repos/rapidsai/cudf/subscription",
      commits_url: "https://api.github.com/repos/rapidsai/cudf/commits{/sha}",
      git_commits_url:
        "https://api.github.com/repos/rapidsai/cudf/git/commits{/sha}",
      comments_url:
        "https://api.github.com/repos/rapidsai/cudf/comments{/number}",
      issue_comment_url:
        "https://api.github.com/repos/rapidsai/cudf/issues/comments{/number}",
      contents_url:
        "https://api.github.com/repos/rapidsai/cudf/contents/{+path}",
      compare_url:
        "https://api.github.com/repos/rapidsai/cudf/compare/{base}...{head}",
      merges_url: "https://api.github.com/repos/rapidsai/cudf/merges",
      archive_url:
        "https://api.github.com/repos/rapidsai/cudf/{archive_format}{/ref}",
      downloads_url: "https://api.github.com/repos/rapidsai/cudf/downloads",
      issues_url: "https://api.github.com/repos/rapidsai/cudf/issues{/number}",
      pulls_url: "https://api.github.com/repos/rapidsai/cudf/pulls{/number}",
      milestones_url:
        "https://api.github.com/repos/rapidsai/cudf/milestones{/number}",
      notifications_url:
        "https://api.github.com/repos/rapidsai/cudf/notifications{?since,all,participating}",
      labels_url: "https://api.github.com/repos/rapidsai/cudf/labels{/name}",
      releases_url: "https://api.github.com/repos/rapidsai/cudf/releases{/id}",
      deployments_url: "https://api.github.com/repos/rapidsai/cudf/deployments",
      created_at: "2017-05-07T03:43:37Z",
      updated_at: "2020-10-29T13:13:02Z",
      pushed_at: "2020-10-29T13:12:59Z",
      git_url: "git://github.com/rapidsai/cudf.git",
      ssh_url: "git@github.com:rapidsai/cudf.git",
      clone_url: "https://github.com/rapidsai/cudf.git",
      svn_url: "https://github.com/rapidsai/cudf",
      homepage: "http://rapids.ai",
      size: 76754,
      stargazers_count: 3381,
      watchers_count: 3381,
      language: "C++",
      has_issues: true,
      has_projects: true,
      has_downloads: true,
      has_wiki: true,
      has_pages: false,
      forks_count: 444,
      mirror_url: null,
      archived: false,
      disabled: false,
      open_issues_count: 545,
      license: {
        key: "apache-2.0",
        name: "Apache License 2.0",
        spdx_id: "Apache-2.0",
        url: "https://api.github.com/licenses/apache-2.0",
        node_id: "MDc6TGljZW5zZTI=",
      },
      forks: 444,
      open_issues: 545,
      watchers: 3381,
      default_branch: base_default_branch,
    },
  },
  _links: {
    self: {
      href: "https://api.github.com/repos/rapidsai/cudf/pulls/6609",
    },
    html: {
      href: "https://github.com/rapidsai/cudf/pull/6609",
    },
    issue: {
      href: "https://api.github.com/repos/rapidsai/cudf/issues/6609",
    },
    comments: {
      href: "https://api.github.com/repos/rapidsai/cudf/issues/6609/comments",
    },
    review_comments: {
      href: "https://api.github.com/repos/rapidsai/cudf/pulls/6609/comments",
    },
    review_comment: {
      href:
        "https://api.github.com/repos/rapidsai/cudf/pulls/comments{/number}",
    },
    commits: {
      href: "https://api.github.com/repos/rapidsai/cudf/pulls/6609/commits",
    },
    statuses: {
      href:
        "https://api.github.com/repos/rapidsai/cudf/statuses/f877b90d5862b0567801f251f36603b99b62cd4b",
    },
  },
  author_association: "MEMBER",
  active_lock_reason: null,
  merged: false,
  mergeable,
  rebaseable: true,
  mergeable_state,
  merged_by: null,
  comments: 2,
  review_comments: 18,
  maintainer_can_modify: true,
  commits: 7,
  additions: 374,
  deletions: 2,
  changed_files: 7,
});

export const prToMerge = base();
export const notMergingToDefaultBranch = base({
  base_default_branch: "randombranch",
});
export const dirtyState = base({
  mergeable_state: "dirty",
});
