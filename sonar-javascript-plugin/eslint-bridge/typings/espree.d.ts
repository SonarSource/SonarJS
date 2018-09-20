declare module "espree" {
  import { AST } from "eslint";
  interface ParseOptions {
    range?: boolean;
    loc?: boolean;
    comment?: boolean;
    attachComment?: false;
    tokens?: boolean;
    ecmaVersion?: number | string;
    sourceType?: "script" | "modules";
    ecmaFeatures?: {
      jsx?: boolean;
      globalReturn?: boolean;
      impliedStrict?: boolean;
    };
  }
  function parse(input: string, config?: ParseOptions): AST.Program;
}

declare module "eslint-plugin-sonarjs";
