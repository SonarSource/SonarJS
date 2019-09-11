import visit from "../../src/utils/visitor";
import { parseTypeScriptSourceFile } from "../../src/parser";
import { SourceCode } from "eslint";

it("should visit a node and its children", () => {
  const sourceCode = parseTypeScriptSourceFile(
    `function factorial(n: number): number {
      if (n < 2) {
        return 1;
      }
      return n * factorial(n - 1);
    }`,
    "foo.ts",
    [],
  ) as SourceCode;
  const visited = [];
  visit(sourceCode, node => visited.push(node.type + " " + node.loc.start.line));
  expect(visited).toEqual([
    "Program 1",
    "FunctionDeclaration 1",
    "Identifier 1",
    "Identifier 1",
    "TSTypeAnnotation 1",
    "TSNumberKeyword 1",
    "TSTypeAnnotation 1",
    "TSNumberKeyword 1",
    "BlockStatement 1",
    "IfStatement 2",
    "BinaryExpression 2",
    "Identifier 2",
    "Literal 2",
    "BlockStatement 2",
    "ReturnStatement 3",
    "Literal 3",
    "ReturnStatement 5",
    "BinaryExpression 5",
    "Identifier 5",
    "CallExpression 5",
    "Identifier 5",
    "BinaryExpression 5",
    "Identifier 5",
    "Literal 5",
  ]);
});
