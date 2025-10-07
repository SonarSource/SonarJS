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
// https://sonarsource.github.io/rspec/#/rspec/S1444/javascript

import type { Rule } from 'eslint';
import type { PropertyDefinition } from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      message: `Make this public static property readonly.`,
      fix: 'Add "readonly" keyword',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'PropertyDefinition[readonly!=true][static=true][accessibility!="private"][accessibility!="protected"]'(
        node: PropertyDefinition,
      ) {
        context.report({
          messageId: 'message',
          node: node.key,
          suggest: [
            {
              fix: fixer => {
                const tokens = context.sourceCode.getTokens(node);
                const staticToken = tokens.find(t => t.value === 'static');
                return fixer.insertTextAfter(staticToken!, ' readonly');
              },
              messageId: 'fix',
            },
          ],
        });
      },
    };
  },
};
