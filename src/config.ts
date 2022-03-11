/**
 * Format of the .github/ops-bot.yaml file that can be
 * set in each repository
 */
export type OpsBotConfig = {
  auto_merger: boolean;
  branch_checker: boolean;
  label_checker: boolean;
  release_drafter: boolean;
  external_contributors: boolean;
};

/**
 * Default configuration options if no config is present in repository
 */
export const DefaultOpsBotConfig: OpsBotConfig = {
  auto_merger: false,
  branch_checker: false,
  label_checker: false,
  release_drafter: false,
  external_contributors: true,
};

/**
 * Configuration file path in repositories
 */
export const OpsBotConfigPath = ".github/ops-bot.yaml";
