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
// https://sonarsource.github.io/rspec/#/rspec/S5148/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getValueOfExpression,
  isIdentifier,
  isMethodCall,
  isStringLiteral,
} from '../helpers/index.js';
import { meta } from './meta.js';

const REQUIRED_OPTION = 'noopener';
const REQUIRED_OPTION_INDEX = 2;
const URL_INDEX = 0;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      missingNoopener: 'Make sure not using "noopener" is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (!isMethodCall(node)) {
          return;
        }
        const { object, property } = node.callee;

        const isWindowOpen =
          isIdentifier(property, 'open') &&
          (isIdentifier(object, 'window') || isThisWindow(object));

        if (!isWindowOpen) {
          return;
        }

        const args = node.arguments;
        const hasHttpUrl = URL_INDEX < args.length && isHttpUrl(context, args[URL_INDEX]);
        if (!hasHttpUrl) {
          return;
        }

        if (
          args.length <= REQUIRED_OPTION_INDEX ||
          !hasRequiredOption(context, args[REQUIRED_OPTION_INDEX])
        ) {
          context.report({
            messageId: 'missingNoopener',
            node: property,
          });
        }
      },
    };
  },
};

function isThisWindow(node: estree.Node) {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'ThisExpression' &&
    isIdentifier(node.property, 'window')
  );
}

function hasRequiredOption(context: Rule.RuleContext, argument: estree.Node) {
  const stringOrNothing = extractString(context, argument);
  return stringOrNothing?.includes(REQUIRED_OPTION);
}

function isHttpUrl(context: Rule.RuleContext, argument: estree.Node): boolean {
  const stringOrNothing = extractString(context, argument);
  return (
    stringOrNothing !== undefined &&
    (stringOrNothing.startsWith('http://') || stringOrNothing.startsWith('https://'))
  );
}

function extractString(context: Rule.RuleContext, node: estree.Node): string | undefined {
  const literalNodeOrNothing = getValueOfExpression(context, node, 'Literal');
  if (literalNodeOrNothing === undefined || !isStringLiteral(literalNodeOrNothing)) {
    return undefined;
  } else {
    return literalNodeOrNothing.value;
  }
}
