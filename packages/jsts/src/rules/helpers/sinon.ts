/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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

export namespace Sinon {
  export function isImported(context: Rule.RuleContext): boolean {
    return (
      getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === 'sinon',
      ) || getImportDeclarations(context).some(i => i.source.value === 'sinon')
    );
  }

  export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
    return isAssertUsage(context, node);
  }

  function isAssertUsage(context: Rule.RuleContext, node: estree.Node) {
    // assert.<expr>(), sinon.assert.<expr>()
    const fqn = extractFQNforCallExpression(context, node);
    if (!fqn) {
      return false;
    }
    const names = fqn.split('.');
    return names.length === 3 && names[0] === 'sinon' && names[1] === 'assert';
  }

  function extractFQNforCallExpression(context: Rule.RuleContext, node: estree.Node) {
    if (node.type !== 'CallExpression') {
      return undefined;
    }
    return getFullyQualifiedName(context, node);
  }
}
