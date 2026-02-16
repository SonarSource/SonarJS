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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import eslintPlugin from 'eslint-plugin-react-hooks';
const rulesOfHooks = (eslintPlugin as any).rules['rules-of-hooks'];
import {
  detectReactRule,
  findFirstMatchingAncestor,
  generateMeta,
  interceptReport,
  isFunctionNode,
  mergeRules,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const FC_TYPES = new Set(['FC', 'FunctionComponent']);

export const NOT_A_COMPONENT_MESSAGE =
  'that is neither a React function component nor a custom React Hook function';

/**
 * Checks whether the given function node is assigned to a variable
 * typed as FC, React.FC, FunctionComponent, or React.FunctionComponent.
 */
function isTypedAsFunctionalComponent(funcNode: TSESTree.Node): boolean {
  const parent = funcNode.parent;
  if (parent?.type !== 'VariableDeclarator') {
    return false;
  }
  const id = parent.id as TSESTree.BindingName;
  if (id.type !== 'Identifier' || !id.typeAnnotation) {
    return false;
  }
  const annotation = id.typeAnnotation.typeAnnotation;
  if (annotation.type !== 'TSTypeReference') {
    return false;
  }
  const { typeName } = annotation;
  if (typeName.type === 'Identifier') {
    return FC_TYPES.has(typeName.name);
  }
  if (
    typeName.type === 'TSQualifiedName' &&
    typeName.left.type === 'Identifier' &&
    typeName.left.name === 'React'
  ) {
    return FC_TYPES.has(typeName.right.name);
  }
  return false;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { ...rulesOfHooks.meta }),
  create(context: Rule.RuleContext) {
    let isReact = false;

    const detectReactListener: Rule.RuleModule = interceptReport(detectReactRule, function () {
      isReact = true;
    });
    const rulesOfHooksListener: Rule.RuleModule = interceptReport(
      rulesOfHooks,
      function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
        if (!isReact) {
          return;
        }
        if (
          'message' in descriptor &&
          typeof descriptor.message === 'string' &&
          descriptor.message.includes(NOT_A_COMPONENT_MESSAGE) &&
          'node' in descriptor
        ) {
          const hookNode = descriptor.node as unknown as TSESTree.Node;
          const enclosingFunction = findFirstMatchingAncestor(hookNode, node =>
            isFunctionNode(node as any),
          );
          if (enclosingFunction && isTypedAsFunctionalComponent(enclosingFunction)) {
            return;
          }
        }
        context.report(descriptor);
      },
    );

    return mergeRules(detectReactListener.create(context), rulesOfHooksListener.create(context));
  },
};
