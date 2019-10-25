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
// https://jira.sonarsource.com/browse/RSPEC-2681

import { Rule } from "eslint";
import * as estree from "estree";
import * as util from "util";
import { toEncodedMessage } from "./utils";
import { TSESTree } from "@typescript-eslint/experimental-utils";

const IF_PRIMARY_MESSAGE =
  "This line will not be executed conditionally; only the first line of this %s-line block will be. The rest will execute unconditionally.";
const IF_SECONDARY_MESSAGE = "not conditionally executed";

const LOOP_PRIMARY_MESSAGE =
  "This line will not be executed in a loop; only the first line of this %s-line block will be. The rest will execute only once.";
const LOOP_SECONDARY_MESSAGE = "not executed in a loop";

type Statement = estree.Statement | estree.ModuleDeclaration;

type NestingStatement =
  | estree.IfStatement
  | estree.ForStatement
  | estree.ForInStatement
  | estree.ForOfStatement
  | estree.WhileStatement;

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ["sonar-runtime"],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      Program: (node: estree.Node) => checkStatements((node as estree.Program).body, context),
      BlockStatement: (node: estree.Node) =>
        checkStatements((node as estree.BlockStatement).body, context),
    };
  },
};

function checkStatements(statements: Statement[], context: Rule.RuleContext) {
  let previous: Statement | undefined;
  statements.forEach((statement, index) => {
    if (previous && isNestingStatement(previous)) {
      const nesting = previous;
      const nested = nestedStatement(nesting);
      if (
        nested.type !== "BlockStatement" &&
        column(nested) === column(statement) &&
        column(nesting) < column(statement)
      ) {
        raiseIssue(statement, nesting, statements.slice(index + 1, statements.length), context);
      }
    }
    previous = statement;
  });
}

function raiseIssue(
  statement: Statement,
  nestingStatement: NestingStatement,
  others: Statement[],
  context: Rule.RuleContext,
) {
  const [primaryMessage, secondaryMessage] =
    nestingStatement.type === "IfStatement"
      ? [IF_PRIMARY_MESSAGE, IF_SECONDARY_MESSAGE]
      : [LOOP_PRIMARY_MESSAGE, LOOP_SECONDARY_MESSAGE];

  let firstStatementInPseudoBlock = nestedStatement(nestingStatement);
  let lastStatementInPseudoBlock = statement;

  const secondaryLocations: Statement[] = [];
  for (const other of others) {
    if (column(other) !== column(statement)) {
      break;
    }
    secondaryLocations.push(other);
    lastStatementInPseudoBlock = other;
  }

  const message = util.format(
    primaryMessage,
    line(lastStatementInPseudoBlock) - line(firstStatementInPseudoBlock) + 1,
  );
  const secondaryMessages = Array(secondaryLocations.length).fill(secondaryMessage);

  context.report({
    message: toEncodedMessage(message, secondaryLocations as TSESTree.Node[], secondaryMessages),
    node: statement,
  });
}

function isNestingStatement(node: estree.Node): node is NestingStatement {
  return [
    "IfStatement",
    "ForStatement",
    "ForInStatement",
    "ForOfStatement",
    "WhileStatement",
  ].includes(node.type);
}

function nestedStatement(node: NestingStatement) {
  if (node.type === "IfStatement") {
    return node.consequent;
  }
  return node.body;
}

function column(node: estree.Node) {
  return node.loc!.start.column;
}

function line(node: estree.Node) {
  return node.loc!.start.line;
}
