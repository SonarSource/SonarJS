/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S3972

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST, Rule } from 'eslint';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import estree from 'estree';
import * as meta from './meta.js';

const message = 'Move this "if" to a new line or add the missing "else".';

interface SiblingIfStatement {
  first: TSESTree.IfStatement;
  following: TSESTree.IfStatement;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      sameLineCondition: message,
      suggestAddingElse: 'Add "else" keyword',
      suggestAddingNewline: 'Move this "if" to a new line',
    },
  }),
  create(context) {
    function checkStatements(statements: estree.Node[]) {
      const { sourceCode } = context;
      const siblingIfStatements = getSiblingIfStatements(statements as TSESTree.Node[]);

      siblingIfStatements.forEach(siblingIfStatement => {
        const precedingIf = siblingIfStatement.first;
        const followingIf = siblingIfStatement.following;
        if (
          !!precedingIf.loc &&
          !!followingIf.loc &&
          precedingIf.loc.end.line === followingIf.loc.start.line &&
          precedingIf.loc.start.line !== followingIf.loc.end.line
        ) {
          const precedingIfLastToken = sourceCode.getLastToken(
            precedingIf as estree.Node,
          ) as TSESLint.AST.Token;
          const followingIfToken = sourceCode.getFirstToken(
            followingIf as estree.Node,
          ) as TSESLint.AST.Token;
          report(
            context,
            {
              messageId: 'sameLineCondition',
              message,
              loc: followingIfToken.loc,
              suggest: [
                {
                  messageId: 'suggestAddingElse',
                  fix: fixer => fixer.insertTextBefore(followingIfToken as AST.Token, 'else '),
                },
                {
                  messageId: 'suggestAddingNewline',
                  fix: fixer =>
                    fixer.replaceTextRange(
                      [precedingIf.range[1], followingIf.range[0]],
                      '\n' + ' '.repeat(precedingIf.loc.start.column),
                    ),
                },
              ],
            },
            [toSecondaryLocation(precedingIfLastToken)],
          );
        }
      });
    }

    return {
      Program: (node: estree.Program) => checkStatements(node.body),
      BlockStatement: (node: estree.BlockStatement) => checkStatements(node.body),
      SwitchCase: (node: estree.SwitchCase) => checkStatements(node.consequent),
    };
  },
};

function getSiblingIfStatements(statements: TSESTree.Node[]): SiblingIfStatement[] {
  return statements.reduce<SiblingIfStatement[]>((siblingsArray, statement, currentIndex) => {
    const previousStatement = statements[currentIndex - 1];
    if (
      statement.type === 'IfStatement' &&
      !!previousStatement &&
      previousStatement.type === 'IfStatement'
    ) {
      return [{ first: previousStatement, following: statement }, ...siblingsArray];
    }
    return siblingsArray;
  }, []);
}
