/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type estree from 'estree';
import {
  generateMeta,
  interceptReport,
  isArray,
  isRequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportExempting,
  );
}

function reportExempting(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
  if (!('node' in descriptor)) {
    return;
  }
  const { node, ...rest } = descriptor;
  const tsNode: TSESTree.Node = node as TSESTree.Node;
  // the reported node is thisArg, need to check the supposed array
  if (
    tsNode.parent?.type === 'CallExpression' &&
    tsNode.parent.callee.type === 'MemberExpression'
  ) {
    if (node === tsNode.parent.arguments[2]) {
      // thisArg is the 3rd argument, the supposed array is the first argument.
      // no need to check for type in this case
      // Array.from(items, mapFn, thisArg)
      context.report(descriptor);
    } else if (isRequiredParserServices(context.sourceCode.parserServices)) {
      // else thisArg node is the second argument, the supposed array is the object in the callee
      // Array.find(callbackFn, thisArg)
      // this case we only raise if the type checker is available and the node is an array
      const nodeToCheck = tsNode.parent.callee.object as estree.Node;

      if (nodeToCheck && isArray(nodeToCheck, context.sourceCode.parserServices)) {
        context.report({ node, ...rest });
      }
    }
  }
}
