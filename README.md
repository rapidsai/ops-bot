# ops-bot

This repo contains a [Probot](https://github.com/probot/probot) application. The application contains the plugins listed below and is deployed using the [probot/serverless-lambda](https://github.com/probot/serverless-lambda) package via the [Serverless framework](https://www.serverless.com/).

## Plugins

The plugins are listed in the [src/plugins](./src/plugins) folder.

- **Label Checker** - Sets a status on PRs that passes if one (and only one) of the following labels from each list have been applied:
  - `bug`, `doc`, `feature request`, or `improvement`
  - `breaking` or `non-breaking`
- **Release Drafter** - Opens up a draft release on GitHub anytime a PR is merged to a versioned branch (i.e. `branch-0.17`, `branch-0.18`, etc.). The draft body includes a categorized changelog consisting of the PRs that have been merged on that branch.
- **Auto Merger** - Automatically merges PRs that include the `/merge` comment and meet the merge criteria outlined in [https://docs.rapids.ai/resources/auto-merger/](https://docs.rapids.ai/resources/auto-merger/).
- **Branch Checker** - Set a status on PRs that checks whether they are targeting either the repo's _default branch_ or _default branch + 1_
- **Recently Updated** - Sets a status on PRs based on whether a PR is `X` commits out-of-date compared to the based branch. `X` defaults to `5`, but is configurable via the `recently_updated_threshold` option in the `.github/ops-bot.yaml` configuration file.

## Infrastructure

The project's infrastructure is managed using Terraform. Key components include:

- AWS Lambda functions for the Probot handler and authorizer
- API Gateway with custom authorizer
- IAM roles and policies
- CloudWatch log groups
- S3 bucket for deployment artifacts

### Prerequisites

- Terraform v1.9.2 or later
- AWS CLI configured with appropriate credentials
- Node.js 18.x

### Deployment

The deployment is automated via GitHub Actions. For manual deployment:

1. Build the application:
```bash
npm install
npm run build
```
2. Package Lambda functions:
```bash
zip -r probot-{version}.zip dist
zip -r authorizer-{version}.zip dist/authorizer.js
```
3. Upload to S3:
```bash
aws s3 cp probot-{version}.zip s3://rapidsai-serverless-deployments/serverless/ops-bot/prod/
aws s3 cp authorizer-{version}.zip s3://rapidsai-serverless-deployments/serverless/ops-bot/prod/
```
4. Deploy infrastructure:
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## npm Scripts

```sh
# Build
npm run build

# Test
npm run test

# Deploy
npm run deploy
```
