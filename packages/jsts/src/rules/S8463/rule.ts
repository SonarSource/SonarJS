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
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const RESERVED_PREFIX = 'sonar_vibe_bot_will_flag_this';

const messages = {
  reservedIdentifier:
    'Rename this identifier; names containing "sonar_vibe_bot_will_flag_this" are reserved for demo purposes and should not appear in production code.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    function checkIdentifier(node: estree.Identifier): void {
      if (node.name.includes(RESERVED_PREFIX)) {
        context.report({ messageId: 'reservedIdentifier', node });
      }
    }

    return {
      FunctionDeclaration(node: estree.Node) {
        const funcDecl = node as estree.FunctionDeclaration;
        if (funcDecl.id) {
          checkIdentifier(funcDecl.id);
        }
      },
      VariableDeclarator(node: estree.Node) {
        const varDecl = node as estree.VariableDeclarator;
        if (varDecl.id.type === 'Identifier') {
          checkIdentifier(varDecl.id as estree.Identifier);
        }
      },
      MethodDefinition(node: estree.Node) {
        const methodDef = node as estree.MethodDefinition;
        if (methodDef.key.type === 'Identifier') {
          checkIdentifier(methodDef.key as estree.Identifier);
        }
      },
    };
  },
};
