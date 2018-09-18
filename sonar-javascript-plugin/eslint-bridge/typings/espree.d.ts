declare module "espree" {
  import { ParseOptions } from "esprima";
  import { AST } from "eslint";
  function parse(input: string, config?: ParseOptions): AST.Program;
}

declare module "eslint-plugin-sonarjs";
