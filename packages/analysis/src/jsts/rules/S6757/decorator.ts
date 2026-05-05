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
import { isIdentifier } from '../helpers/ast.js';
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

      if (isThisMemberExpression(node) && isLexicallyBoundToReactClassComponent(node)) {
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

function isLexicallyBoundToReactClassComponent(node: TSESTree.MemberExpression): boolean {
  for (const current of ancestorsChain(node, new Set<string>())) {
    if (isClassMember(current)) {
      return isInsideReactClassComponent(current);
    }

    if (isNonLexicalFunctionBoundary(current)) {
      return false;
    }
  }

  return false;
}

function isClassMember(node: TSESTree.Node): boolean {
  return node.type === 'MethodDefinition' || node.type === 'PropertyDefinition';
}

function isNonLexicalFunctionBoundary(node: TSESTree.Node): boolean {
  if (node.type === 'FunctionDeclaration') {
    return true;
  }

  if (node.type !== 'FunctionExpression') {
    return false;
  }

  return node.parent?.type !== 'MethodDefinition';
}

function isInsideReactClassComponent(classMember: TSESTree.Node): boolean {
  for (const current of ancestorsChain(classMember, new Set<string>())) {
    if (current.type === 'ClassDeclaration' || current.type === 'ClassExpression') {
      return isReactClassComponent(current);
    }
  }

  return false;
}

function isReactClassComponent(
  node: TSESTree.ClassDeclaration | TSESTree.ClassExpression,
): boolean {
  return node.superClass != null && isReactComponentSuperclass(node.superClass);
}

function isReactComponentSuperclass(superClass: TSESTree.Expression): boolean {
  return (
    isIdentifier(superClass, 'Component') ||
    isIdentifier(superClass, 'PureComponent') ||
    (superClass.type === 'MemberExpression' &&
      isIdentifier(superClass.object, 'React') &&
      (isIdentifier(superClass.property, 'Component') ||
        isIdentifier(superClass.property, 'PureComponent')))
  );
}
