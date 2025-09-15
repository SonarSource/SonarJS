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
// https://sonarsource.github.io/rspec/#/rspec/S2137/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, globalsByLibraries } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const illegalNames = new Set(['arguments']);
const objectPrototypeProperties = new Set([
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
]);
const deprecatedNames = new Set(['escape', 'unescape']);

const getDeclarationIssue = (redeclareType: string) => (name: string) => ({
  messageId: 'forbidDeclaration',
  data: { symbol: name, type: redeclareType },
});

const getModificationIssue = (functionName: string) => ({
  messageId: 'removeModification',
  data: { symbol: functionName },
});

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeModification: 'Remove the modification of "{{symbol}}".',
      forbidDeclaration: 'Do not use "{{symbol}}" to declare a {{type}} - use another name.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression'(node: estree.Node) {
        const func = node as estree.FunctionDeclaration | estree.FunctionExpression;
        reportBadUsageOnFunction(func, func.id, context);
      },
      ArrowFunctionExpression(node: estree.Node) {
        reportBadUsageOnFunction(node as estree.ArrowFunctionExpression, undefined, context);
      },
      VariableDeclaration(node: estree.Node) {
        for (const decl of (node as estree.VariableDeclaration).declarations) {
          reportGlobalShadowing(
            decl.id,
            getDeclarationIssue('variable'),
            context,
            decl.init != null,
          );
        }
      },
      UpdateExpression(node: estree.Node) {
        reportGlobalShadowing(
          (node as estree.UpdateExpression).argument,
          getModificationIssue,
          context,
          true,
        );
      },
      AssignmentExpression(node: estree.Node) {
        reportGlobalShadowing(
          (node as estree.AssignmentExpression).left,
          getModificationIssue,
          context,
          true,
        );
      },
      CatchClause(node: estree.Node) {
        reportGlobalShadowing(
          (node as estree.CatchClause).param,
          getDeclarationIssue('variable'),
          context,
          true,
        );
      },
    };
  },
};

function reportBadUsageOnFunction(
  func: estree.Function,
  id: estree.Node | null | undefined,
  context: Rule.RuleContext,
) {
  reportGlobalShadowing(id, getDeclarationIssue('function'), context, true);
  for (const p of func.params) {
    reportGlobalShadowing(p, getDeclarationIssue('parameter'), context, false);
  }
}

function reportGlobalShadowing(
  node: estree.Node | null | undefined,
  buildMessageAndData: (name: string) => { messageId: string; data: any },
  context: Rule.RuleContext,
  isWrite: boolean,
) {
  if (node) {
    switch (node.type) {
      case 'Identifier': {
        if (isGlobalShadowing(node.name, isWrite) && !isShadowingException(node.name)) {
          context.report({
            node,
            ...buildMessageAndData(node.name),
          });
        }
        break;
      }
      case 'RestElement':
        reportGlobalShadowing(node.argument, buildMessageAndData, context, true);
        break;
      case 'ObjectPattern':
        for (const prop of node.properties) {
          if (prop.type === 'Property') {
            reportGlobalShadowing(prop.value, buildMessageAndData, context, true);
          } else {
            reportGlobalShadowing(prop.argument, buildMessageAndData, context, true);
          }
        }
        break;
      case 'ArrayPattern':
        for (const elem of node.elements) {
          reportGlobalShadowing(elem, buildMessageAndData, context, true);
        }
        break;
      case 'AssignmentPattern':
        reportGlobalShadowing(node.left, buildMessageAndData, context, true);
        break;
    }
  }
}

function isGlobalShadowing(name: string, isWrite: boolean) {
  return isIllegalName(name) || isBuiltInName(name) || isUndefinedShadowing(isWrite, name);
}

function isIllegalName(name: string) {
  return illegalNames.has(name);
}

function isBuiltInName(name: string) {
  return globalsByLibraries.builtin.includes(name);
}

function isUndefinedShadowing(isWrite: boolean, name: string) {
  return isWrite && name === 'undefined';
}

function isShadowingException(name: string) {
  return isObjectPrototypeProperty(name) || isDeprecatedName(name);
}

function isObjectPrototypeProperty(name: string) {
  return objectPrototypeProperties.has(name);
}

function isDeprecatedName(name: string) {
  return deprecatedNames.has(name);
}
