# auto-merger

This folder contains a Node script that uses [octokit/rest.js](https://github.com/octokit/rest.js/) to automatically merge PRs for any repo that the `rapids-ops-bot` GitHub application is installed on. In order for a PR to be automatically merged, it must meet the following criteria:

- All CI checks must be passing
- Must not have merge conflits
- Must not be merging to the `main` branch
- Must have `6 - Okay to Auto-Merge` label applied
- User who last applied `6 - Okay to Auto-Merge` label must be a part of the GitHub team `<repo>-write`, where `<repo>` is `cudf`, `cuml`, `cugraph` etc.

The PR will be squash merged and the commit title will be formatted like `<PR_Title> (#<PR_Number>)` and the commit message will be formatted like:

```
This PR adds some extra line breaks to the commit messages.

Authors:
  - AJ Schmidt <aschmidt@nvidia.com>

Approvers:
  - AJ Schmidt

URL: https://github.com/rapidsai/ops-bot/pull/28
```

## Deployment

The _Serverless_ framework is used to deploy the Node application to an AWS Lambda instance. The deployment configuration can be seen in the [serverless.yaml](./serverless.yaml) file. A deployment will happen automatically anytime a change is merged to the `main` branch affecting any of the following files: source code files, `package.json` file, or `serverless.yaml` file. See the [deploy.merger.yaml](/.github/workflows/deploy.merger.yaml) GitHub Action for more details.

## npm Scripts

```sh
# Build
npm run build

# Test
npm run test

# Deploy
npm run deploy
```
