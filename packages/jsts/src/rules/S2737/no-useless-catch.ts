/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2737

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { isThrowStatement } from '../utils/nodes';
import { areEquivalent } from '../utils/equivalence';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      uselessCatch:
        'Add logic to this catch clause or eliminate it and rethrow the exception automatically.',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: '"catch" clauses should do more than rethrow',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    return {
      CatchClause: (node: TSESTree.Node) => visitCatchClause(node as TSESTree.CatchClause, context),
    };
  },
};

function visitCatchClause(
  catchClause: TSESTree.CatchClause,
  context: TSESLint.RuleContext<string, string[]>,
) {
  const statements = catchClause.body.body;
  if (
    catchClause.param &&
    statements.length === 1 &&
    onlyRethrows(statements[0], catchClause.param, context.sourceCode)
  ) {
    const catchKeyword = context.sourceCode.getFirstToken(catchClause)!;
    context.report({
      messageId: 'uselessCatch',
      loc: catchKeyword.loc,
    });
  }
}

function onlyRethrows(
  statement: TSESTree.Statement,
  catchParam: TSESTree.CatchClause['param'],
  sourceCode: TSESLint.SourceCode,
) {
  return (
    isThrowStatement(statement) &&
    catchParam !== null &&
    statement.argument !== null &&
    areEquivalent(catchParam, statement.argument, sourceCode)
  );
}

export = rule;
