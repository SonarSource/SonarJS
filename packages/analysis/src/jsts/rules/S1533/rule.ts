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
import { childrenOf, findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { getVariableFromScope } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const WRAPPER_TYPES = new Set(['Boolean', 'Number', 'String']);

// Wrapper types in these type-definition contexts are not runtime concerns and should not be flagged
const TYPE_DEFINITION_CONTEXTS = new Set(['TSInterfaceBody', 'TSTypeAliasDeclaration']);
const LOCAL_TYPE_DEFINITION_TYPES = new Set(['TSInterfaceDeclaration', 'TSTypeAliasDeclaration']);
type LocalTypeDefinition = TSESTree.TSInterfaceDeclaration | TSESTree.TSTypeAliasDeclaration;
type TraversalState = {
  hitCycle: boolean;
};

function isInTypeDefinitionContext(node: TSESTree.Node) {
  return findFirstMatchingAncestor(node, ancestor => TYPE_DEFINITION_CONTEXTS.has(ancestor.type));
}

function isTypeArgumentOfCallOrNewExpression(node: TSESTree.Node) {
  const parent = node.parent;
  return (
    parent?.type === 'TSTypeParameterInstantiation' &&
    (parent.parent?.type === 'CallExpression' || parent.parent?.type === 'NewExpression')
  );
}

function getWrapperTypeName(
  sourceCode: Rule.RuleContext['sourceCode'],
  node: TSESTree.TSTypeReference,
) {
  const typeName = sourceCode.getText(node as unknown as estree.Node);
  return WRAPPER_TYPES.has(typeName) ? typeName : undefined;
}

function containsWrapperInLocalDefinition(
  definition: LocalTypeDefinition | undefined,
  localWrapperBearingTypes: Map<string, boolean>,
  visitedNames: Set<string>,
  containsWrapperType: (
    node: TSESTree.Node,
    visitedNames: Set<string>,
    state: TraversalState,
  ) => boolean,
) {
  if (definition?.id.type !== 'Identifier') {
    return false;
  }

  const { name } = definition.id;
  const cached = localWrapperBearingTypes.get(name);
  if (cached === true) {
    return true;
  }
  if (visitedNames.has(name)) {
    return false;
  }

  const state = { hitCycle: false };
  visitedNames.add(name);
  const containsWrapper = containsWrapperType(definition, visitedNames, state);
  visitedNames.delete(name);

  if (containsWrapper || !state.hitCycle) {
    localWrapperBearingTypes.set(name, containsWrapper);
  }
  return containsWrapper;
}

function markCycleAndReturnFalse(state: TraversalState) {
  state.hitCycle = true;
  return false;
}

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

    function getLocalTypeDefinition(
      node: TSESTree.TSTypeReference,
    ): LocalTypeDefinition | undefined {
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

    function containsWrapperType(
      node: TSESTree.Node,
      visitedNames = new Set<string>(),
      state: TraversalState = { hitCycle: false },
    ): boolean {
      if (node.type === 'TSTypeReference') {
        if (getWrapperTypeName(context.sourceCode, node)) {
          return true;
        }

        const localTypeDefinition = getLocalTypeDefinition(node);
        if (localTypeDefinition?.id.type === 'Identifier') {
          const cached = localWrapperBearingTypes.get(localTypeDefinition.id.name);
          if (cached === true) {
            return true;
          }
          if (visitedNames.has(localTypeDefinition.id.name)) {
            return markCycleAndReturnFalse(state);
          }
        }

        if (
          containsWrapperInLocalDefinition(
            localTypeDefinition,
            localWrapperBearingTypes,
            visitedNames,
            containsWrapperType,
          )
        ) {
          return true;
        }
      }

      for (const child of childrenOf(
        node as unknown as estree.Node,
        context.sourceCode.visitorKeys,
      )) {
        if (containsWrapperType(child as TSESTree.Node, visitedNames, state)) {
          return true;
        }
      }
      return false;
    }

    function reportDirectWrapperType(node: estree.Node, wrapperType: string) {
      const primitiveType = wrapperType.toLowerCase();
      context.report({
        messageId: 'replaceWrapper',
        data: {
          wrapper: wrapperType,
          primitive: primitiveType,
        },
        node,
        suggest: [
          {
            messageId: 'suggestReplaceWrapper',
            data: {
              wrapper: wrapperType,
              primitive: primitiveType,
            },
            fix: fixer => fixer.replaceText(node, primitiveType),
          },
        ],
      });
    }

    function reportLocalWrapperType(node: estree.Node, localTypeDefinition: LocalTypeDefinition) {
      if (localTypeDefinition.id.type !== 'Identifier') {
        return;
      }

      const { name } = localTypeDefinition.id;
      if (!containsWrapperType(localTypeDefinition, new Set([name]))) {
        return;
      }

      localWrapperBearingTypes.set(name, true);
      context.report({
        node,
        messageId: 'localWrapperType',
      });
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
        const typeReference = node as unknown as TSESTree.TSTypeReference;
        if (
          isInTypeDefinitionContext(typeReference) ||
          isTypeArgumentOfCallOrNewExpression(typeReference)
        ) {
          return;
        }

        const wrapperType = getWrapperTypeName(context.sourceCode, typeReference);
        if (wrapperType) {
          reportDirectWrapperType(node, wrapperType);
          return;
        }

        const localTypeDefinition = getLocalTypeDefinition(typeReference);
        if (localTypeDefinition) {
          reportLocalWrapperType(node, localTypeDefinition);
        }
      },
    };
  },
};
