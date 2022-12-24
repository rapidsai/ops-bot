import { Context, Logger } from "probot";
import {
  DefaultOpsBotConfig,
  OpsBotConfig,
  OpsBotConfigFeatureNames,
  OpsBotConfigFeatureValues,
  OpsBotConfigPath,
} from "./config";

// Abstract Base Class
export class OpsBotPlugin {
  public context: Context;
  public logger: Logger;
  public pluginName: keyof OpsBotConfigFeatureNames;

  constructor(pluginName: keyof OpsBotConfigFeatureNames, context: Context) {
    this.context = context;
    this.logger = context.log.child({ plugin: pluginName });
    this.pluginName = pluginName;
  }

  /**
   *
   * Returns true if the specified plugin is disabled.
   */
  async pluginIsDisabled(): Promise<boolean> {
    const config = await this.getConfig();
    return !config[this.pluginName];
  }

  /**
   *
   * Returns the specified configuration value.
   */
  async getConfigValue(
    value: keyof OpsBotConfigFeatureValues
  ): Promise<number> {
    const config = await this.getConfig();
    return config[value];
  }

  /**
   *
   * Returns the configuration file from the repository's default branch.
   */
  async getConfig(): Promise<OpsBotConfig> {
    const context = this.context;

    const repoParams = context.repo();
    const { config } = await context.octokit.config.get({
      ...repoParams,
      path: OpsBotConfigPath,
      defaults: DefaultOpsBotConfig,
    });

    this.logger.info({ ...repoParams, config }, "repo config");
    return config;
  }
}
