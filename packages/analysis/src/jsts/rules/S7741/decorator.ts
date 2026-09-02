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
    // the `typeof` operand is a bare identifier with no reaching declaration, so it may be an
    // undeclared global: `typeof` is the only way to probe it without throwing a ReferenceError,
    // since rewriting to a plain `=== undefined` comparison would throw instead.
    //
    // Note this carve-out only applies to bare identifiers: `typeof` does not protect a
    // member-expression operand (e.g. `typeof ns.flag`) from throwing either, because
    // evaluating `ns.flag` already needs to resolve `ns` first. So `typeof ns.flag === "undefined"`
    // and `ns.flag === undefined` throw the exact same error when `ns` has no reaching
    // declaration, and the rewrite is always safe to suggest for member-expression operands.
    return;
  }
  context.report(descriptor);
}

function hasNoReachingDeclaration(node: estree.Node, context: Rule.RuleContext): boolean {
  if (
    node.type !== 'BinaryExpression' ||
    node.left.type !== 'UnaryExpression' ||
    node.left.operator !== 'typeof' ||
    node.left.argument.type !== 'Identifier'
  ) {
    return false;
  }
  const root = node.left.argument;
  return getVariableFromName(context, root.name, root) === undefined;
}
