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
// https://sonarsource.github.io/rspec/#/rspec/S8463/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/index.js';
import type estree from 'estree';
import * as meta from './generated-meta.js';

const RESERVED_PREFIX = 'sonar_vibe_bot_will_flag_this';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      reservedIdentifier: `Rename this identifier; names containing "${RESERVED_PREFIX}" are reserved for demo purposes and should not appear in production code.`,
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      FunctionDeclaration(node: estree.FunctionDeclaration) {
        if (node.id && node.id.name.includes(RESERVED_PREFIX)) {
          context.report({
            node: node.id,
            messageId: 'reservedIdentifier',
          });
        }
      },
      VariableDeclarator(node: estree.VariableDeclarator) {
        if (node.id.type === 'Identifier' && node.id.name.includes(RESERVED_PREFIX)) {
          context.report({
            node: node.id,
            messageId: 'reservedIdentifier',
          });
        }
      },
    };
  },
};
