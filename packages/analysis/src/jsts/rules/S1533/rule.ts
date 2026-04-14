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
// https://sonarsource.github.io/rspec/#/rspec/S1533/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const WRAPPER_TYPES = new Set(['Boolean', 'Number', 'String']);

// Wrapper types in these type-definition contexts are not runtime concerns and should not be flagged
const TYPE_DEFINITION_CONTEXTS = new Set([
  'TSInterfaceBody',
  'TSTypeAliasDeclaration',
  'TSTypeLiteral',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      removeConstructor: 'Remove this use of "{{constructor}}" constructor.',
      replaceWrapper:
        'Replace this "{{wrapper}}" wrapper object with primitive type "{{primitive}}".',
      suggestRemoveNew: 'Remove "new" operator',
      suggestReplaceWrapper: 'Replace "{{wrapper}}" with "{{primitive}}"',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      NewExpression(node: estree.Node) {
        const konstructor = (node as estree.NewExpression).callee;
        if (konstructor.type === 'Identifier' && WRAPPER_TYPES.has(konstructor.name)) {
          const newToken = context.sourceCode.getFirstToken(node, token => token.value === 'new')!;
          const [begin, end] = newToken.range;
          context.report({
            messageId: 'removeConstructor',
            data: {
              constructor: konstructor.name,
            },
            node,
            suggest: [
              {
                messageId: 'suggestRemoveNew',
                fix: fixer => fixer.removeRange([begin, end + 1]),
              },
            ],
          });
        }
      },
      TSTypeReference(node: estree.Node) {
        const typeString = context.sourceCode.getText(node);
        if (WRAPPER_TYPES.has(typeString)) {
          if (
            findFirstMatchingAncestor(node as TSESTree.Node, a =>
              TYPE_DEFINITION_CONTEXTS.has(a.type),
            )
          ) {
            return;
          }
          // Suppress wrapper types as type args directly in call/new expressions
          // (e.g. createMap<String>(), new Map<Number, String>()) — these are pure type annotations
          const parent = (node as TSESTree.Node).parent;
          if (
            parent?.type === 'TSTypeParameterInstantiation' &&
            (parent.parent?.type === 'CallExpression' || parent.parent?.type === 'NewExpression')
          ) {
            return;
          }
          const primitiveType = typeString.toLowerCase();
          context.report({
            messageId: 'replaceWrapper',
            data: {
              wrapper: typeString,
              primitive: primitiveType,
            },
            node,
            suggest: [
              {
                messageId: 'suggestReplaceWrapper',
                data: {
                  wrapper: typeString,
                  primitive: primitiveType,
                },
                fix: fixer => fixer.replaceText(node, primitiveType),
              },
            ],
          });
        }
      },
    };
  },
};
