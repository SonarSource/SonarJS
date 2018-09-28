declare module "espree" {
  import { AST, Linter } from "eslint";
  function parse(input: string, config?: Linter.ParserOptions): AST.Program;
}
// FIXME: remove following declaration. we should rely on "eslint-plugin-sonarjs" published typings
declare module "eslint-plugin-sonarjs";
