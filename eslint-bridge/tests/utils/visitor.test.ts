import visit from "../../src/utils/visitor";
import { parseTypeScriptSourceFile } from "../../src/parser";

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
  );
  const visited = {
    identifiers: 0,
    functions: 0,
    literals: 0,
    returns: 0,
    blocks: 0,
    calls: 0,
    bins: 0,
    ifs: 0,
  };
  visit(sourceCode.ast, node => {
    switch (node.type) {
      case "Identifier":
        visited.identifiers++;
        break;
      case "Literal":
        visited.literals++;
        break;
      case "IfStatement":
        visited.ifs++;
        break;
      case "FunctionDeclaration":
        visited.functions++;
        break;
      case "ReturnStatement":
        visited.returns++;
        break;
      case "BlockStatement":
        visited.blocks++;
        break;
      case "BinaryExpression":
        visited.bins++;
        break;
      case "CallExpression":
        visited.calls++;
        break;
    }
  });
  expect(visited).toEqual({
    identifiers: 6,
    functions: 1,
    literals: 3,
    returns: 2,
    blocks: 2,
    calls: 1,
    bins: 3,
    ifs: 1,
  });
});
