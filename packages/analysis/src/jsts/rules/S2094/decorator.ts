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
// https://sonarsource.github.io/rspec/#/rspec/S2094/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { Node } from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { isFunctionNode } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (
        'messageId' in descriptor &&
        descriptor.messageId === 'onlyConstructor' &&
        'node' in descriptor
      ) {
        const node = descriptor.node as estree.Node & Rule.NodeParentExtension;
        const classNode = getClassNode(node);
        if (
          classNode &&
          hasThisPropertyAssignmentInConstructor(classNode, context.sourceCode.visitorKeys)
        ) {
          return;
        }
      }
      context.report(descriptor);
    },
  );
}

function getClassNode(
  node: estree.Node & Rule.NodeParentExtension,
): estree.ClassDeclaration | estree.ClassExpression | null {
  if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
    return node;
  }
  if (node.type === 'Identifier') {
    const parent = node.parent as estree.Node;
    if (parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') {
      return parent;
    }
  }
  return null;
}

function hasThisPropertyAssignmentInConstructor(
  classNode: estree.ClassDeclaration | estree.ClassExpression,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  const ctor = classNode.body.body.find(
    (member): member is estree.MethodDefinition =>
      member.type === 'MethodDefinition' && member.kind === 'constructor',
  );

  if (!ctor) {
    return false;
  }

  const constructorBody = ctor.value.body;
  return walkForThisAssignment(constructorBody, visitorKeys);
}

function walkForThisAssignment(node: Node, visitorKeys: SourceCode.VisitorKeys): boolean {
  // Stop recursion at function boundaries — assignments inside nested functions do not
  // count as constructor-level state initialization.
  if (isFunctionNode(node)) {
    return false;
  }

  if (isThisPropertyAssignment(node)) {
    return true;
  }

  return childrenOf(node, visitorKeys).some(child => walkForThisAssignment(child, visitorKeys));
}

function isThisPropertyAssignment(node: Node): boolean {
  if (node.type !== 'AssignmentExpression') {
    return false;
  }
  const { left } = node;
  return left.type === 'MemberExpression' && left.object.type === 'ThisExpression';
}
