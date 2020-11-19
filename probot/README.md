# probot

This folder contains a [Probot](https://github.com/probot/probot) application. The application contains the plugins listed below and is deployed using the [probot/serverless-lambda](https://github.com/probot/serverless-lambda) package via the [Serverless framework](https://www.serverless.com/).

## Plugins

The plugins are listed in the [src/plugins](./src/plugins) folder directory.

- **LabelCheck** - Sets a status on PRs that passes if one (and only one) of the following labels from each list have been applied: 
  - `bug`, `doc`, `feature request`, or `improvement`
  - `breaking` or `non-breaking`
- **Release Drafter** - Opens up a draft release on GitHub anytime a PR is merged to a versioned branch (i.e. `branch-0.17`, `branch-0.18`, etc.). The draft body includes a categorized changelog consisting of the PRs that have been merged on that branch.

## Deployment

The _Serverless_ framework is used to deploy the Probot application to an AWS Lambda instance. The deployment configuration can be seen in the [serverless.yaml](./serverless.yaml) file. A deployment will happen automatically anytime a change is merged to the `main` branch affecting any of the following files: source code files, `package.json` file, or `serverless.yaml` file. See the [deploy.probot.yaml](/.github/workflows/deploy.probot.yaml) GitHub Action for more details.

## npm Scripts

```sh
# Build
npm run build

# Test
npm run test

# Deploy
npm run deploy
```
