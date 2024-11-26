/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6478/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  functionLike,
  generateMeta,
  getMainFunctionTokenLocation,
  interceptReportForReact,
  RuleContext,
} from '../helpers/index.js';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    (context, report) => {
      const message =
        'Move this component definition out of the parent component and pass data as props.';
      const { node } = report as { node: estree.Node };
      const loc = getMainNodeLocation(node, context);
      if (loc) {
        context.report({ ...report, loc, message });
      } else {
        context.report({ ...report, message });
      }
    },
  );

  function getMainNodeLocation(node: estree.Node, context: Rule.RuleContext) {
    /* class components */
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      if (node.id) {
        return node.id.loc;
      } else {
        return context.sourceCode.getFirstToken(node, token => token.value === 'class')?.loc;
      }
    }

    /* functional components */
    if (functionLike.has(node.type)) {
      const fun = node as unknown as TSESTree.FunctionLike;
      const ctx = context as unknown as RuleContext;
      return getMainFunctionTokenLocation(fun, fun.parent, ctx) as estree.SourceLocation;
    }

    /* should not happen */
    return node.loc;
  }
}
