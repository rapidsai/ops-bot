import { OpsBotConfig } from "../../../src/config";

export const makeConfigReponse = <E extends Partial<OpsBotConfig>>(
  opsBotConfig: E
): { config: E } => {
  return { config: opsBotConfig };
};
