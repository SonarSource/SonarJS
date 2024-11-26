/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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

import { Rule, SourceCode } from 'eslint';
import { areEquivalent, generateMeta, isThrowStatement } from '../helpers/index.js';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      uselessCatch:
        'Add logic to this catch clause or eliminate it and rethrow the exception automatically.',
    },
  }),
  create(context) {
    return {
      CatchClause: (node: estree.CatchClause) => visitCatchClause(node, context),
    };
  },
};

function visitCatchClause(catchClause: estree.CatchClause, context: Rule.RuleContext) {
  const statements = catchClause.body.body;
  if (
    catchClause.param &&
    statements.length === 1 &&
    onlyRethrows(statements[0] as TSESTree.Statement, catchClause.param, context.sourceCode)
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
  catchParam: estree.CatchClause['param'],
  sourceCode: SourceCode,
) {
  return (
    isThrowStatement(statement) &&
    catchParam !== null &&
    statement.argument !== null &&
    areEquivalent(catchParam as TSESTree.Node, statement.argument, sourceCode)
  );
}
