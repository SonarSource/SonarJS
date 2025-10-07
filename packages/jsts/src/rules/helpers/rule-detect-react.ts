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
import type { Rule } from 'eslint';
import type { Node } from 'estree';

const detectReactSelector = [
  ':matches(',
  [
    'CallExpression[callee.name="require"][arguments.0.value="react"]',
    'CallExpression[callee.name="require"][arguments.0.value="create-react-class"]',
    'ImportDeclaration[source.value="react"]',
  ].join(','),
  ')',
].join('');

export const detectReactRule: Rule.RuleModule = {
  meta: {
    messages: {
      reactDetected: 'React detected',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      [detectReactSelector](node: Node) {
        context.report({
          messageId: 'reactDetected',
          node,
        });
      },
    };
  },
};
