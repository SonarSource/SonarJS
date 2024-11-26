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
// https://sonarsource.github.io/rspec/#/rspec/S3533/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import * as helpers from '../helpers/index.js';
import { generateMeta, isStringLiteral } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      standardImport: 'Use a standard "import" statement instead of "{{adhocImport}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    return {
      'CallExpression[callee.type="Identifier"]': (node: estree.Node) => {
        if (
          context.sourceCode.getScope(node).type !== 'module' &&
          context.sourceCode.getScope(node).type !== 'global'
        ) {
          return;
        }
        const callExpression = node as estree.CallExpression;
        const identifier = callExpression.callee as estree.Identifier;
        if (
          isAmdImport(callExpression, identifier, services) ||
          isCommonJsImport(callExpression, identifier, services)
        ) {
          context.report({
            node: identifier,
            messageId: 'standardImport',
            data: {
              adhocImport: identifier.name,
            },
          });
        }
      },
    };
  },
};

function isString(
  node: estree.SpreadElement | estree.Expression,
  services?: helpers.RequiredParserServices,
): boolean {
  return (
    (helpers.isRequiredParserServices(services) && helpers.isString(node, services)) ||
    isStringLiteral(node)
  );
}

function isCommonJsImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
  services: helpers.RequiredParserServices,
): boolean {
  return (
    callExpression.arguments.length === 1 &&
    isString(callExpression.arguments[0], services) &&
    identifier.name === 'require'
  );
}

function isAmdImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
  services?: helpers.RequiredParserServices,
): boolean {
  if (identifier.name !== 'require' && identifier.name !== 'define') {
    return false;
  }
  if (callExpression.arguments.length !== 2 && callExpression.arguments.length !== 3) {
    return false;
  }
  return (
    helpers.isRequiredParserServices(services) &&
    helpers.isFunction(callExpression.arguments[callExpression.arguments.length - 1], services)
  );
}
