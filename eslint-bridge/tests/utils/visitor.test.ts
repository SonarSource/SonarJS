/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
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
