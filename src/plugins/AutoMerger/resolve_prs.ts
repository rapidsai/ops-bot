import { Logger } from "probot";
import { issueIsPR, isMergeComment } from "../../shared";
import {
  AutoMergerContext,
  IssueCommentContext,
  PRReviewContext,
  StatusContext,
} from "../../types";

export class PRNumberResolver {
  public context: AutoMergerContext;
  public logger: Logger;

  constructor(context: AutoMergerContext, logger: Logger) {
    this.context = context;
    this.logger = logger;
  }
  async getPrNumbers(): Promise<number[]> {
    const { context } = this;

    switch (context.name) {
      case "status":
        return this.statusContextHandler(context);
      case "issue_comment":
        return this.issueCommentContextHandler(context);
      case "pull_request_review":
        return this.pullRequestReviewContextHandler(context);
      default:
        return [];
    }
  }

  async statusContextHandler(context: StatusContext): Promise<number[]> {
    if (context.payload.state !== "success") {
      this.logger.info("status was not success");
      return [];
    }
    return this.getPRNumbersfromSHA(context.payload.sha);
  }

  issueCommentContextHandler(context: IssueCommentContext): number[] {
    const comment = context.payload.comment.body;
    if (!issueIsPR(context)) {
      this.logger.info("comment was for issue, not PR");
      return [];
    }
    if (!isMergeComment(comment)) {
      this.logger.info("not a merge comment");
      return [];
    }
    return [context.payload.issue.number];
  }

  pullRequestReviewContextHandler(context: PRReviewContext): number[] {
    if (context.payload.review.state !== "approved") {
      this.logger.info("PR review was not approval");
      return [];
    }
    return [context.payload.pull_request.number];
  }

  /**
   * Returns open pull requests that contain SHA from webhook payload.
   * @param context
   */
  async getPRNumbersfromSHA(sha: string): Promise<number[]> {
    const { context } = this;
    const repoName = context.payload.repository.full_name;

    const { data: prs } = await context.octokit.search.issuesAndPullRequests({
      q: `${sha}+is:pr+is:open+repo:${repoName}`,
      per_page: 100,
    });

    const prNumbers = prs.items.map((el) => el.number);
    this.logger.info({ prs: prNumbers }, "PRs associated with commit");
    return prNumbers;
  }
}
