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
// https://sonarsource.github.io/rspec/#/rspec/S6757/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { ancestorsChain } from '../helpers/ancestor.js';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const { node } = reportDescriptor as { node?: TSESTree.Node };

      if (isThisMemberExpression(node) && isLexicallyBoundToClassMember(node)) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

function isThisMemberExpression(
  node: TSESTree.Node | undefined,
): node is TSESTree.MemberExpression {
  return node?.type === 'MemberExpression' && node.object.type === 'ThisExpression';
}

function isLexicallyBoundToClassMember(node: TSESTree.MemberExpression): boolean {
  let previous: TSESTree.Node = node;

  for (const current of ancestorsChain(node, new Set<string>())) {
    if (isClassMember(current)) {
      // Only the member value owns the instance receiver. A computed key or a member
      // decorator is evaluated in the enclosing scope, which may be a functional component.
      return previous === current.value;
    }

    if (isNonLexicalFunctionBoundary(current)) {
      return false;
    }

    previous = current;
  }

  return false;
}

function isClassMember(
  node: TSESTree.Node,
): node is TSESTree.MethodDefinition | TSESTree.PropertyDefinition | TSESTree.AccessorProperty {
  return (
    node.type === 'MethodDefinition' ||
    node.type === 'PropertyDefinition' ||
    node.type === 'AccessorProperty'
  );
}

function isNonLexicalFunctionBoundary(node: TSESTree.Node): boolean {
  if (node.type === 'FunctionDeclaration') {
    return true;
  }

  if (node.type !== 'FunctionExpression') {
    return false;
  }

  // Method bodies are transparent so traversal can reach the enclosing MethodDefinition.
  return node.parent?.type !== 'MethodDefinition';
}
