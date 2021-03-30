import axios from "axios";
import { IssueCommentContext } from "../../types";
import { JenkinsPermissions } from "./jenkins_permission";

/**
 * The various type of commands which trigger individual jobs
 */
export enum TriggerCommand {
  ALL = "all",
  CUDA_ONLY = "cuda",
  PYTHON_ONLY = "python",
  GPU_ONLY = "gpu",
  INVALID = "invalid",
}

/**
 * Only repos in this list will be processed by JobComponentTrigger
 */
export const ENABLED_REPOSITORIES: string[] = ['rapidsai/rmm-testbed'];

export class JobComponentTrigger {
  public context: IssueCommentContext;
  public permissions: JenkinsPermissions;

  constructor(context: IssueCommentContext, permissions: JenkinsPermissions) {
    this.context = context;
    this.permissions = permissions;
  }

  /**
   * Based on the given IssueComment, potentially trigger a job via POST request to gpuCI
   */
  async maybeTriggerJobs(): Promise<any> {
    const context = this.context;

    const repo = context.payload.repository;
    const prNumber = context.payload.issue.number;
    //Check if repo is enabled
    if (!ENABLED_REPOSITORIES.includes(repo.full_name)) {
      console.warn(
        `Comment on ${repo.full_name} #${prNumber} was not in the enabled repo list. Skipping...`
      );
      return false;
    }
    //Only run on PRs
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
    //Check permissions
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

    //Build payload to POST to gpuCI - this payload is defined in gpuci-scripts
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
      trigger_author: username,
      trigger_url: context.payload.comment.html_url
    };
    //Authenticate with gpuCI
    const axiosOptions = {
      headers: { token: process.env.JENKINS_WEBHOOK_TOKEN },
    };
    //The response is always 200 even if no jobs were triggered and the output is suppressed, so no point in parsing anything
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
