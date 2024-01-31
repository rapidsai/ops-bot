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

/**
 * Names of the ops-bot features. Used to determine whether a given
 * feature is enabled
 */
export type OpsBotConfigFeatureNames = {
  auto_merger: boolean;
  branch_checker: boolean;
  label_checker: boolean;
  release_drafter: boolean;
  recently_updated: boolean;
  forward_merger: boolean;
};

/**
 * Configurable values for ops-bot features
 */
export type OpsBotConfigFeatureValues = {
  recently_updated_threshold: number;
};

/**
 * Format of the .github/ops-bot.yaml file that can be
 * set in each repository
 */
export type OpsBotConfig = OpsBotConfigFeatureNames & OpsBotConfigFeatureValues;

/**
 * Default configuration options if no config is present in repository
 */
export const DefaultOpsBotConfig: OpsBotConfig = {
  auto_merger: false,
  branch_checker: false,
  label_checker: false,
  release_drafter: false,
  recently_updated: false,
  recently_updated_threshold: 5,
  forward_merger: false,
};

/**
 * Configuration file path in repositories
 */
export const OpsBotConfigPath = ".github/ops-bot.yaml";
