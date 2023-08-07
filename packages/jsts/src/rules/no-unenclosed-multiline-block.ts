/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2681/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';

const NestingStatementLike = [
  'IfStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
];

type Statement = estree.Statement | estree.ModuleDeclaration;

type NestingStatement =
  | estree.IfStatement
  | estree.ForStatement
  | estree.ForInStatement
  | estree.ForOfStatement
  | estree.WhileStatement;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      Program: (node: estree.Node) => checkStatements((node as estree.Program).body, context),
      BlockStatement: (node: estree.Node) =>
        checkStatements((node as estree.BlockStatement).body, context),
      TSModuleBlock: (node: estree.Node) =>
        checkStatements((node as unknown as TSESTree.TSModuleBlock).body as Statement[], context),
    };
  },
};

function checkStatements(statements: Statement[], context: Rule.RuleContext) {
  chain(statements)
    .filter(chainedStatements => chainedStatements.areUnenclosed())
    .forEach(unenclosedConsecutives => {
      if (unenclosedConsecutives.areAdjacent()) {
        raiseAdjacenceIssue(unenclosedConsecutives, context);
      } else if (unenclosedConsecutives.areBothIndented()) {
        raiseBlockIssue(
          unenclosedConsecutives,
          countStatementsInTheSamePile(unenclosedConsecutives.prev, statements),
          context,
        );
      } else if (unenclosedConsecutives.areInlinedAndIndented()) {
        raiseInlineAndIndentedIssue(unenclosedConsecutives, context);
      }
    });
}

function chain(statements: Statement[]): ChainedStatements[] {
  return statements
    .reduce((result, statement, i, array) => {
      if (i < array.length - 1 && isNestingStatement(statement)) {
        result.push({ prev: statement, next: array[i + 1] });
      }
      return result;
    }, new Array<{ prev: NestingStatement; next: Statement }>())
    .map(pair => {
      return new ChainedStatements(pair.prev, extractLastBody(pair.prev), pair.next);
    });
}

function extractLastBody(statement: NestingStatement) {
  if (statement.type === 'IfStatement') {
    if (statement.alternate) {
      return statement.alternate;
    } else {
      return statement.consequent;
    }
  } else {
    return statement.body;
  }
}

function countStatementsInTheSamePile(reference: Statement, statements: Statement[]) {
  const startOfPile = position(reference).start;
  let lastLineOfPile = startOfPile.line;
  for (const statement of statements) {
    const currentPosition = position(statement);
    const currentLine = currentPosition.end.line;
    const currentIndentation = currentPosition.start.column;
    if (currentLine > startOfPile.line) {
      if (currentIndentation === startOfPile.column) {
        lastLineOfPile = currentPosition.end.line;
      } else {
        break;
      }
    }
  }
  return lastLineOfPile - startOfPile.line + 1;
}

function raiseAdjacenceIssue(adjacentStatements: ChainedStatements, context: Rule.RuleContext) {
  context.report({
    message:
      `This statement will not be executed ${adjacentStatements.includedStatementQualifier()}; only the first statement will be. ` +
      `The rest will execute ${adjacentStatements.excludedStatementsQualifier()}.`,
    node: adjacentStatements.next,
  });
}

function raiseBlockIssue(
  piledStatements: ChainedStatements,
  sizeOfPile: number,
  context: Rule.RuleContext,
) {
  context.report({
    message:
      `This line will not be executed ${piledStatements.includedStatementQualifier()}; only the first line of this ${sizeOfPile}-line block will be. ` +
      `The rest will execute ${piledStatements.excludedStatementsQualifier()}.`,
    node: piledStatements.next,
  });
}

function raiseInlineAndIndentedIssue(
  chainedStatements: ChainedStatements,
  context: Rule.RuleContext,
) {
  context.report({
    message:
      `This line will not be executed ${chainedStatements.includedStatementQualifier()}; only the first statement will be. ` +
      `The rest will execute ${chainedStatements.excludedStatementsQualifier()}.`,
    node: chainedStatements.next,
  });
}

function isNestingStatement(node: estree.Node): node is NestingStatement {
  return NestingStatementLike.includes(node.type);
}

class ChainedStatements {
  private readonly positions: Positions;

  constructor(
    readonly topStatement: NestingStatement,
    readonly prev: Statement,
    readonly next: Statement,
  ) {
    const topPosition = position(topStatement);
    const prevPosition = position(prev);
    const nextPosition = position(next);
    this.positions = {
      prevTopStart: topPosition.start,
      prevTopEnd: topPosition.end,
      prevStart: prevPosition.start,
      prevEnd: prevPosition.end,
      nextStart: nextPosition.start,
      nextEnd: nextPosition.end,
    };
  }

  public areUnenclosed(): boolean {
    return this.prev.type !== 'BlockStatement';
  }

  public areAdjacent(): boolean {
    return this.positions.prevEnd.line === this.positions.nextStart.line;
  }

  public areBothIndented(): boolean {
    return (
      this.positions.prevStart.column === this.positions.nextStart.column && this.prevIsIndented()
    );
  }

  public areInlinedAndIndented(): boolean {
    return (
      this.positions.prevStart.line === this.positions.prevTopEnd.line &&
      this.positions.nextStart.column > this.positions.prevTopStart.column
    );
  }

  public includedStatementQualifier(): string {
    return this.topStatement.type === 'IfStatement' ? 'conditionally' : 'in a loop';
  }

  public excludedStatementsQualifier(): string {
    return this.topStatement.type === 'IfStatement' ? 'unconditionally' : 'only once';
  }

  private prevIsIndented(): boolean {
    return this.positions.prevStart.column > this.positions.prevTopStart.column;
  }
}

type Positions = {
  prevTopStart: estree.Position;
  prevTopEnd: estree.Position;
  prevStart: estree.Position;
  prevEnd: estree.Position;
  nextStart: estree.Position;
  nextEnd: estree.Position;
};

function position(node: estree.Node) {
  return (node as TSESTree.Node).loc;
}
