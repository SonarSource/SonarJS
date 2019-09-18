declare module "espree" {
  import { AST, Linter } from "eslint";
  function parse(input: string, config?: Linter.ParserOptions): AST.Program;
}
