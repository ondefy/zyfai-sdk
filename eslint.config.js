import tsdoc from "eslint-plugin-tsdoc";
import tsParser from "@typescript-eslint/parser";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: { tsdoc },
    rules: {
      "tsdoc/syntax": "warn",
    },
  },
];
