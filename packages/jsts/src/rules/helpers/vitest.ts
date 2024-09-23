/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { getFullyQualifiedName, getImportDeclarations, getRequireCalls } from '.';

export namespace Vitest {
  export function isImported(context: Rule.RuleContext): boolean {
    const variants = ['vitest', '@fast-check/vitest'];

    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && variants.includes(r.arguments[0].value as string),
      ) || getImportDeclarations(context).some(i => variants.includes(i.source.value as string))
    );
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
    return isExpectUsage(context, node);
  }

  function isExpectUsage(context: Rule.RuleContext, node: estree.Node): boolean {
    // expect(), vitest.expect()
    const fqn = extractFQNforCallExpression(context, node);

    return (
      fqn !== undefined &&
      fqn !== null &&
      ['vitest.expect', '@fast-check.vitest.expect'].includes(fqn)
    );
  }

  function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }
    return getFullyQualifiedName(context, node);
  }
}
