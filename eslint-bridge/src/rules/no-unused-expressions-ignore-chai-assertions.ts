/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Rule } from 'eslint';
import * as estree from 'estree';
import { interceptReport } from '../utils/decorators';

export function ignoreChaiAssertions(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, reportExemptingChaiAssertions);
}

function reportExemptingChaiAssertions(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
): void {
  if ('node' in reportDescriptor) {
    const n: estree.Node = reportDescriptor['node'];
    const expr = (n as estree.ExpressionStatement).expression;
    const isExempt = containsChaiExpect(expr) || containsValidChaiShould(expr);
    if (!isExempt) {
      context.report(reportDescriptor);
    }
  }
}

function containsChaiExpect(node: estree.Node): boolean {
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'Identifier' && node.callee.name === 'expect') {
      return true;
    } else {
      return containsChaiExpect(node.callee);
    }
  } else if (node.type === 'MemberExpression') {
    return containsChaiExpect(node.object);
  }
  return false;
}

function containsValidChaiShould(node: estree.Node, isSubexpr = false): boolean {
  if (node.type === 'CallExpression') {
    return containsValidChaiShould(node.callee, true);
  } else if (node.type === 'MemberExpression') {
    if (node.property && node.property.type === 'Identifier' && node.property.name === 'should') {
      // Expressions like `x.should` are valid only as subexpressions, not on top level
      return isSubexpr;
    } else {
      return containsValidChaiShould(node.object, true);
    }
  }
  return false;
}
