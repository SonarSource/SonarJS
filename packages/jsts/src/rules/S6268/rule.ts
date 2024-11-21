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
// https://sonarsource.github.io/rspec/#/rspec/S6268/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isLiteral, isMemberWithProperty } from '../helpers/index.js';
import { meta } from './meta.js';

const bypassMethods = [
  'bypassSecurityTrustHtml',
  'bypassSecurityTrustStyle',
  'bypassSecurityTrustScript',
  'bypassSecurityTrustUrl',
  'bypassSecurityTrustResourceUrl',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      checkAngularBypass: 'Make sure disabling Angular built-in sanitization is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const { callee, arguments: args } = node as estree.CallExpression;

        if (
          isMemberWithProperty(callee, ...bypassMethods) &&
          args.length === 1 &&
          !isHardcodedLiteral(args[0])
        ) {
          context.report({
            messageId: 'checkAngularBypass',
            node: (callee as estree.MemberExpression).property,
          });
        }
      },
    };
  },
};

function isHardcodedLiteral(node: estree.Node) {
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  } else {
    return isLiteral(node);
  }
}
