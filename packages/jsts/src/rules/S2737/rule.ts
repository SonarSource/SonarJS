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
// https://sonarsource.github.io/rspec/#/rspec/S2737

import { Rule, SourceCode } from 'eslint';
import { areEquivalent, generateMeta, isThrowStatement } from '../helpers/index.js';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
