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
// https://sonarsource.github.io/rspec/#/rspec/S2245/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeGenerator: 'Make sure that using this pseudorandom number generator is safe here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.CallExpression) {
        const fqn = getFullyQualifiedName(context, node);
        if (fqn === 'Math.random') {
          context.report({
            messageId: 'safeGenerator',
            node,
          });
        }
      },
    };
  },
};
