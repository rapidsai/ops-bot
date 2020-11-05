`branch-0.18` is a dummy branch and should only be used to test the `release-drafter`. All real commits should be merged into branch-0.17.

This is a dummy commit.

Another dummy commit.

More dummy commits. Keep 'em coming.

# ops-bot

The `ops-bot` consists of the following automations:

- `auto-merger` - A cron-scheduled Lambda function that uses [octokit/rest.js/](https://github.com/octokit/rest.js/) to automatically merge pull requests that meet certain criteria.
- `probot` - A [Probot](https://github.com/probot/probot) application that's used for things like checking labels on PRs and drafting release notes when PRs are merged.
