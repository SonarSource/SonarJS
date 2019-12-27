declare module "babel-eslint" {
  import { AST, Linter, Scope, SourceCode } from "eslint";
  function parse(input: string, config?: Linter.ParserOptions): AST.Program;
  function parseForESLint(input: string, config?: Linter.ParserOptions): { ast: AST.Program, parserServices: SourceCode.ParserServices, scopeManager: Scope.ScopeManager, visitorKeys: SourceCode.VisitorKeys };
}
