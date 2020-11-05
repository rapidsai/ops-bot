# ops-bot

The `ops-bot` consists of the following automations:

- `auto-merger` - A cron-scheduled Lambda function that uses [octokit/rest.js/](https://github.com/octokit/rest.js/) to automatically merge pull requests that meet certain criteria.
- `probot` - A [Probot](https://github.com/probot/probot) application that's used for things like checking labels on PRs and drafting release notes when PRs are merged.
