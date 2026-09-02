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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { getVariableFromName } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportExempting,
  );
}

function reportExempting(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
  if ('node' in descriptor && hasNoReachingDeclaration(descriptor.node as estree.Node, context)) {
    // the `typeof` operand has no reaching declaration, so it may be an undeclared
    // global: rewriting to a plain `=== undefined` comparison would throw a ReferenceError
    return;
  }
  context.report(descriptor);
}

function hasNoReachingDeclaration(node: estree.Node, context: Rule.RuleContext): boolean {
  if (
    node.type !== 'BinaryExpression' ||
    node.left.type !== 'UnaryExpression' ||
    node.left.operator !== 'typeof'
  ) {
    return false;
  }
  const root = getRootIdentifier(node.left.argument as estree.Node);
  return root !== null && getVariableFromName(context, root.name, root) === undefined;
}

function getRootIdentifier(node: estree.Node): estree.Identifier | null {
  let current = node;
  while (current.type === 'MemberExpression') {
    current = current.object as estree.Node;
  }
  return current.type === 'Identifier' ? current : null;
}
