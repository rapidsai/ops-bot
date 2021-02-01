import axios from "axios";
import { IssueCommentContext } from "../../types";
import { JenkinsPermissions } from "./jenkins_permission";

export enum TriggerCommand {
  ALL = "all",
  CUDA_ONLY = "cuda",
  PYTHON_ONLY = "python",
  GPU_ONLY = "gpu",
  INVALID = "invalid",
}

export const ENABLED_REPOSITORIES: string[] = [];

export class JobComponentTrigger {
  public context: IssueCommentContext;
  public permissions: JenkinsPermissions;

  constructor(context: IssueCommentContext, permissions: JenkinsPermissions) {
    this.context = context;
    this.permissions = permissions;
  }

  async maybeTriggerJobs(): Promise<any> {
    const context = this.context;

    const repo = context.payload.repository;
    const prNumber = context.payload.issue.number;
    if (!ENABLED_REPOSITORIES.includes(repo.full_name)) {
      console.warn(
        `Comment on ${repo.full_name} #${prNumber} was not in the enabled repo list. Skipping...`
      );
      return false;
    }
    if (!this.isPR(context)) {
      console.warn(
        `Comment on ${repo.full_name} #${prNumber} was not on a PR. Skipping...`
      );
      return false;
    }

    const commentBody = context.payload.comment.body;
    const username = context.payload.comment.user.login;

    const command = this.parseCommentBody(commentBody);

    if (command == TriggerCommand.INVALID) {
      console.warn(
        `Comment on ${repo.full_name} #${prNumber} was not a valid trigger. Skipping...`
      );
      return false;
    }
    if (!await this.permissions.hasPermissionToTrigger(context)) {
      console.warn(
        `Comment on ${repo.full_name} #${prNumber} by ${username} does not have trigger permissions. Skipping...`
      );
      return false;
    }

    // Get PR info
    const { data: pr } = await context.octokit.pulls.get({
      owner: repo.owner.login,
      repo: repo.name,
      pull_number: prNumber,
    });

    const jenkinsPayload = {
      pr_id: prNumber,
      commit_hash: `origin/pr/${prNumber}/merge`,
      report_hash: pr.head.sha,
      pr_author: pr.user.login,
      source_branch: pr.head.ref,
      target_branch: pr.base.ref,
      flash_id: prNumber,
      repository: repo.full_name,
      trigger: command,
    };
    const axiosOptions = {
      headers: { token: process.env.JENKINS_WEBHOOK_TOKEN },
    };
    await axios.post(
      "https://gpuci.gpuopenanalytics.com/generic-webhook-trigger/invoke",
      jenkinsPayload,
      axiosOptions
    );
    return true;
  }

  /**
   * Returns true if the payload associated with the provided context
   * is from a GitHub Pull Request (as opposed to a GitHub Issue).
   * @param context
   */
  isPR(context: IssueCommentContext): boolean {
    return "pull_request" in context.payload.issue;
  }

  /**
   * Parses a comment into a specific TriggerCommand
   * @param body the body of an issue comment
   */
  parseCommentBody(body: string): TriggerCommand {
    if (body.startsWith("@gpucibot ")) {
      body = body.replace("@gpucibot ", "");
      switch (body) {
        case "rerun tests":
        case "run tests":
          return TriggerCommand.ALL;
        case "run cuda build":
          return TriggerCommand.CUDA_ONLY;
        case "run python build":
          return TriggerCommand.PYTHON_ONLY;
        case "run gpu build":
          return TriggerCommand.GPU_ONLY;
      }
    }
    return TriggerCommand.INVALID;
  }
}
