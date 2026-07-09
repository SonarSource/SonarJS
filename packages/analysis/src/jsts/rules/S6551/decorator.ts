/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6551/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isGenericType } from '../helpers/type.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';
import { isGuardedDirectToStringCall } from './helpers/guarded-tostring.js';
import { classifyArgumentToStringification, USEFUL_TO_STRING } from './helpers/stringification.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const services = context.sourceCode.parserServices;
        const node = reportDescriptor.node as TSESTree.Node;
        if (
          isGenericType(node, services) ||
          isGuardedDirectToStringCall(reportDescriptor, context)
        ) {
          // we skip
        } else {
          const redirectedReport = applyKnownUtilityToStringRedirection(reportDescriptor, context);
          if (redirectedReport !== undefined) {
            context.report(redirectedReport);
          }
        }
      }
    },
  );
}

function applyKnownUtilityToStringRedirection(
  reportDescriptor: Rule.ReportDescriptor,
  context: Rule.RuleContext,
): Rule.ReportDescriptor | undefined {
  if (
    !('node' in reportDescriptor) ||
    !('messageId' in reportDescriptor) ||
    reportDescriptor.messageId !== 'baseToString'
  ) {
    return reportDescriptor;
  }

  const argument = getKnownUtilityToStringArgument(reportDescriptor.node as TSESTree.Node, context);
  if (argument === undefined) {
    return reportDescriptor;
  }

  const argumentStringification = classifyArgumentToStringification(argument, context);
  const shouldReportArgument = argumentStringification !== USEFUL_TO_STRING;
  if (!shouldReportArgument) {
    return undefined;
  }

  return {
    ...reportDescriptor,
    node: argument as estree.Node,
    data: {
      ...('data' in reportDescriptor ? reportDescriptor.data : {}),
      name: context.sourceCode.getText(argument as estree.Node),
      certainty: argumentStringification,
    },
  };
}

function getKnownUtilityToStringArgument(
  node: TSESTree.Node,
  context: Rule.RuleContext,
): TSESTree.Expression | undefined {
  const call = getContainingToStringCallExpression(node);
  if (
    call?.arguments.length !== 1 ||
    call.arguments[0].type === 'SpreadElement' ||
    getFullyQualifiedName(context, call as estree.CallExpression) !== 'lodash.toString'
  ) {
    return undefined;
  }

  return call.arguments[0];
}

function getContainingToStringCallExpression(
  node: TSESTree.Node,
): TSESTree.CallExpression | undefined {
  const parent = node.parent;
  if (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    parent.property.type === 'Identifier' &&
    parent.property.name === 'toString' &&
    parent.parent?.type === 'CallExpression' &&
    parent.parent.callee === parent
  ) {
    return parent.parent;
  }
  return undefined;
}
