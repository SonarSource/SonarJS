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
import { childrenOf } from '../helpers/ancestor.js';
import { getVariableFromScope } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const WRAPPER_TYPES = new Set(['Boolean', 'Number', 'String']);

// Wrapper types in these type-definition contexts are not runtime concerns and should not be flagged
const TYPE_DEFINITION_CONTEXTS = new Set(['TSInterfaceBody', 'TSTypeAliasDeclaration']);
const LOCAL_TYPE_DEFINITION_TYPES = new Set(['TSInterfaceDeclaration', 'TSTypeAliasDeclaration']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      localWrapperType:
        'Refactor this type so it does not rely on wrapper object types hidden behind a local type.',
      removeConstructor: 'Remove this use of "{{constructor}}" constructor.',
      replaceWrapper:
        'Replace this "{{wrapper}}" wrapper object with primitive type "{{primitive}}".',
      suggestRemoveNew: 'Remove "new" operator',
      suggestReplaceWrapper: 'Replace "{{wrapper}}" with "{{primitive}}"',
    },
  }),
  create(context: Rule.RuleContext) {
    const localWrapperBearingTypes = new Map<string, boolean>();

    function isInTypeDefinitionContext(node: TSESTree.Node) {
      return findFirstMatchingAncestor(node, ancestor =>
        TYPE_DEFINITION_CONTEXTS.has(ancestor.type),
      );
    }

    function isTypeArgumentOfCallOrNewExpression(node: TSESTree.Node) {
      const parent = node.parent;
      return (
        parent?.type === 'TSTypeParameterInstantiation' &&
        (parent.parent?.type === 'CallExpression' || parent.parent?.type === 'NewExpression')
      );
    }

    function getLocalTypeDefinition(
      node: TSESTree.TSTypeReference,
    ): TSESTree.TSInterfaceDeclaration | TSESTree.TSTypeAliasDeclaration | undefined {
      if (node.typeName.type !== 'Identifier') {
        return undefined;
      }
      const scope = context.sourceCode.getScope(node as unknown as estree.Node);
      const variable = getVariableFromScope(scope, node.typeName.name);
      const definition = variable?.defs.find(def =>
        LOCAL_TYPE_DEFINITION_TYPES.has(def.node.type),
      )?.node;
      if (
        definition?.type === 'TSInterfaceDeclaration' ||
        definition?.type === 'TSTypeAliasDeclaration'
      ) {
        return definition;
      }
      return undefined;
    }

    function containsWrapperType(node: TSESTree.Node, visitedNames = new Set<string>()): boolean {
      if (node.type === 'TSTypeReference') {
        const typeName = context.sourceCode.getText(node);
        if (WRAPPER_TYPES.has(typeName)) {
          return true;
        }

        const definition = getLocalTypeDefinition(node);
        if (definition?.id.type === 'Identifier') {
          const { name } = definition.id;
          const cached = localWrapperBearingTypes.get(name);
          if (cached !== undefined) {
            return cached;
          }
          if (visitedNames.has(name)) {
            return false;
          }

          visitedNames.add(name);
          const containsWrapper = containsWrapperType(definition, visitedNames);
          visitedNames.delete(name);
          localWrapperBearingTypes.set(name, containsWrapper);
          return containsWrapper;
        }
      }

      for (const child of childrenOf(
        node as unknown as estree.Node,
        context.sourceCode.visitorKeys,
      )) {
        if (containsWrapperType(child as TSESTree.Node, visitedNames)) {
          return true;
        }
      }
      return false;
    }

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
        const typeReference = node as TSESTree.TSTypeReference;
        const typeString = context.sourceCode.getText(node);
        if (
          isInTypeDefinitionContext(typeReference) ||
          isTypeArgumentOfCallOrNewExpression(typeReference)
        ) {
          return;
        }

        if (WRAPPER_TYPES.has(typeString)) {
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
          return;
        }

        const localTypeDefinition = getLocalTypeDefinition(typeReference);
        if (
          localTypeDefinition?.id.type === 'Identifier' &&
          containsWrapperType(localTypeDefinition, new Set([localTypeDefinition.id.name]))
        ) {
          localWrapperBearingTypes.set(localTypeDefinition.id.name, true);
          context.report({
            node,
            messageId: 'localWrapperType',
          });
        }
      },
    };
  },
};
