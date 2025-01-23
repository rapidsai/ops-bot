// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // config with just ignores is the replacement for `.eslintignore`
    ignores: [
      "dist",
      "node_modules",
      "build.mjs",
      "coverage",
      "eslint.config.mjs",
      "jest.config.cjs",
    ],
  },
  // TODO: fix this line
  // eslint-disable-next-line
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "sort-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          caughtErrors: "none",
        },
      ],
    },
  },
);
