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
// https://sonarsource.github.io/rspec/#/rspec/S1219/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeLabel: 'Remove this misleading "{{label}}" label.',
    },
  }),
  create(context: Rule.RuleContext) {
    const stack: number[] = [0];
    function enterCase() {
      stack.push(stack.pop()! + 1);
    }
    function leaveCase() {
      stack.push(stack.pop()! - 1);
    }
    function inCase() {
      return stack.at(-1)! > 0;
    }
    return {
      SwitchCase: () => {
        enterCase();
      },
      LabeledStatement: (node: estree.Node) => {
        if (inCase()) {
          const label = (node as estree.LabeledStatement).label;
          context.report({
            messageId: 'removeLabel',
            data: {
              label: label.name,
            },
            node: label,
          });
        }
      },
      'FunctionExpression, FunctionDeclaration': () => {
        stack.push(0);
      },
      'SwitchCase:exit': () => {
        leaveCase();
      },
      'FunctionExpression, FunctionDeclaration :exit': () => {
        stack.pop();
      },
    };
  },
};
