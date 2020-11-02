import { Endpoints } from "@octokit/types";

export interface Author {
  name: string;
  email: string;
}
export type AppsListReposResponseRepositories = Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"];
export type SearchIssuesAndPullRequestsResponseItems = Endpoints["GET /search/issues"]["response"]["data"]["items"];
