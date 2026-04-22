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
// https://sonarsource.github.io/rspec/#/rspec/S7722/javascript

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
    (context, reportDescriptor) => {
      const node = (reportDescriptor as any).node as estree.Node;

      if (isStackTraceCapturePattern(node, context)) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

function isStackTraceCapturePattern(node: estree.Node, context: Rule.RuleContext): boolean {
  const parent = (node as any).parent as estree.Node | undefined;
  if (!parent) {
    return false;
  }

  // Pattern 1: new Error().stack or new Error()['stack'] used as a read (not write target)
  if (parent.type === 'MemberExpression' && isStackRead(parent as estree.MemberExpression)) {
    return true;
  }

  // Pattern 2: const err = new Error(); where err is used exclusively for .stack reads
  if (isVariableUsedExclusivelyForStackReads(node, parent, context)) {
    return true;
  }

  return false;
}

function isStackRead(memberExpr: estree.MemberExpression): boolean {
  if (!isStackProperty(memberExpr)) {
    return false;
  }
  const parent = (memberExpr as any).parent as estree.Node | undefined;
  return !(
    parent?.type === 'AssignmentExpression' &&
    (parent as estree.AssignmentExpression).left === memberExpr
  );
}

function isStackProperty(memberExpr: estree.MemberExpression): boolean {
  if (!memberExpr.computed) {
    return (memberExpr.property as estree.Identifier).name === 'stack';
  }
  return memberExpr.property.type === 'Literal' && memberExpr.property.value === 'stack';
}

function isVariableUsedExclusivelyForStackReads(
  node: estree.Node,
  parent: estree.Node,
  context: Rule.RuleContext,
): boolean {
  if (parent.type !== 'VariableDeclarator') {
    return false;
  }
  const declarator = parent as estree.VariableDeclarator;
  if (declarator.id.type !== 'Identifier') {
    return false;
  }
  const variable = getVariableFromName(context, declarator.id.name, node);
  if (!variable) {
    return false;
  }
  const readRefs = variable.references.filter(ref => ref.isRead());
  return (
    readRefs.length > 0 &&
    readRefs.every(ref => {
      const refParent = (ref.identifier as any).parent as estree.Node | undefined;
      return (
        refParent?.type === 'MemberExpression' && isStackRead(refParent as estree.MemberExpression)
      );
    })
  );
}
