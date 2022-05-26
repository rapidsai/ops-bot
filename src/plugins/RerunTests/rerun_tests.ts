/*
 * Copyright (c) 2022, NVIDIA CORPORATION.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from "axios";
import { featureIsDisabled, issueIsPR } from "../../shared";
import { IssueCommentContext } from "../../types";

export class RerunTests {
  public context: IssueCommentContext;

  constructor(context: IssueCommentContext) {
    this.context = context;
  }

  async maybeRerunTests(): Promise<any> {
    const context = this.context;

    if (await featureIsDisabled(context, "rerun_tests")) return;

    if (!issueIsPR(context)) return;
    if (!context.payload.comment.body.match(/.*(re)?run\W+tests.*/)) return;

    const repo = context.payload.repository.name;
    const prNumber = context.payload.issue.number;
    const isPrivate = context.payload.repository.private;
    const jenkinsServer = "https://gpuci.gpuopenanalytics.com";
    const postUrl = `${jenkinsServer}/job/${
      isPrivate ? "private-repos-ci/job/" : ""
    }orgs/job/${repo}/job/pull-request%252F${prNumber}/build`;

    // Response looks like `Jenkins-Crumb:<crumb>`
    const { data: resp } = await axios.get<string>(
      `${jenkinsServer}/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,%22:%22,//crumb)`,
      {
        auth: {
          username: process.env.JENKINS_USERNAME as string,
          password: process.env.JENKINS_TOKEN as string,
        },
      }
    );

    const jenkinsCrumb = resp.split(":")[1];

    console.log("Posting to:", postUrl);
    try {
      await axios.post(postUrl, null, {
        headers: {
          "Jenkins-Crumb": jenkinsCrumb,
        },
        auth: {
          username: process.env.JENKINS_USERNAME as string,
          password: process.env.JENKINS_TOKEN as string,
        },
      });
    } catch (error) {
      console.error(`Could not rerun tests for ${repo} PR number ${prNumber}:`);
      console.error(error);
    }
  }
}
