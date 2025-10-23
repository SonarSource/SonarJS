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

import type estree from 'estree';
import {
  generateMeta,
  interceptReport,
  isRequiredParserServices,
  typeHasMethod,
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
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return;
  }

  if ('node' in descriptor) {
    // let's check the type of the node to see if it's an array
    const { node, ...rest } = descriptor;
    let nodeToCheck: TSESTree.Node = node as TSESTree.Node;
    //array[array.length - 1] the reported node is the index "array.length - 1"
    //const foo = array.slice(-1).shift(); the reported node is 'slice'
    if (
      nodeToCheck.parent?.type === 'MemberExpression' &&
      nodeToCheck.parent.property === nodeToCheck
    ) {
      nodeToCheck = nodeToCheck.parent.object;
    }
    // foo = string.charAt(string.length - 5); the reported node is the first argument "string.length - 5"
    else if (
      nodeToCheck.parent?.type === 'CallExpression' &&
      nodeToCheck.parent.arguments.includes(nodeToCheck as TSESTree.CallExpressionArgument) &&
      nodeToCheck.parent.callee.type === 'MemberExpression'
    ) {
      nodeToCheck = nodeToCheck.parent.callee.object;
    }
    //const foo = lodash.last(array); the reported node is the callee "lodash.last", we want the array itself
    else if (
      nodeToCheck.parent?.type === 'CallExpression' &&
      nodeToCheck.parent.callee === nodeToCheck
    ) {
      nodeToCheck = nodeToCheck.parent.arguments[0] as TSESTree.Node;
    }
    if (nodeToCheck && typeHasMethod(nodeToCheck as estree.Node, 'at', services)) {
      context.report({ node, ...rest });
    }
  }
}
