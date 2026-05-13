/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S4624

import type { TSESTree } from '@typescript-eslint/utils';
import { isOnEnclosingTemplateDelimiterLine } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import type { Rule } from 'eslint';
import type estree from 'estree';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      nestedTemplateLiterals: 'Refactor this code to not use nested template literals.',
    },
  }),
  create(context) {
    return {
      'TemplateLiteral TemplateLiteral': (node: estree.Node) => {
        if (isOnEnclosingTemplateDelimiterLine(node as TSESTree.Node)) {
          context.report({
            messageId: 'nestedTemplateLiterals',
            node,
          });
        }
      },
    };
  },
};
