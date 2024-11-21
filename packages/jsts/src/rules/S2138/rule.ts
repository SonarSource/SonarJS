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
// https://sonarsource.github.io/rspec/#/rspec/S2138/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isUndefined } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      useNull: 'Use null instead.',
    },
  }),
  create(context: Rule.RuleContext) {
    function raiseOnUndefined(node: estree.Node) {
      if (isUndefined(node)) {
        context.report({
          messageId: 'useNull',
          node,
        });
      }
    }
    return {
      VariableDeclarator: (node: estree.Node) => {
        const { init } = node as estree.VariableDeclarator;
        if (init) {
          raiseOnUndefined(init);
        }
      },
      AssignmentExpression: (node: estree.Node) => {
        const { right } = node as estree.AssignmentExpression;
        raiseOnUndefined(right);
      },
      Property: (node: estree.Node) => {
        const { value } = node as estree.Property;
        raiseOnUndefined(value);
      },
    };
  },
};
