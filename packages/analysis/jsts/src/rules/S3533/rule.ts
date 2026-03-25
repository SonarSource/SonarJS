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
// https://sonarsource.github.io/rspec/#/rspec/S3533/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { isStringLiteral } from '../helpers/ast.js';
import { isFunction, isString as isStringType } from '../helpers/type.js';
import {
  type RequiredParserServices,
  isRequiredParserServices,
} from '../helpers/parser-services.js';
import { last } from '../helpers/collection.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
  services?: RequiredParserServices,
): boolean {
  return isRequiredParserServices(services) ? isStringType(node, services) : isStringLiteral(node);
}

function isCommonJsImport(
  callExpression: estree.CallExpression,
  identifier: estree.Identifier,
  services: RequiredParserServices,
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
  services?: RequiredParserServices,
): boolean {
  if (identifier.name !== 'require' && identifier.name !== 'define') {
    return false;
  }
  if (callExpression.arguments.length !== 2 && callExpression.arguments.length !== 3) {
    return false;
  }
  return isRequiredParserServices(services) && isFunction(last(callExpression.arguments), services);
}
