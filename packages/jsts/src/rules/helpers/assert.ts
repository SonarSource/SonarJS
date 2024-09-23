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

/**
 * Node.js assert library support module.
 */
export function isImported(context: Rule.RuleContext): boolean {
  const assertVariants = ['assert', 'node:assert'];

  return (
    getRequireCalls(context).some(
      r =>
        r.arguments[0].type === 'Literal' &&
        assertVariants.includes(r.arguments[0].value as string),
    ) || getImportDeclarations(context).some(i => assertVariants.includes(i.source.value as string))
  );
}

/**
 * Returns true is the passed node represents a Node.js assert library assertion.
 */
export function isAssertion(context: Rule.RuleContext, node: estree.Node): boolean {
  // assert.<expr>() or <expr()>
  const fqn = extractFQNForCallExpression(context, node);
  if (!fqn) {
    return false;
  }
  const names = fqn.split('.');
  return names.length === 2 && names[0] === 'assert';
}

function extractFQNForCallExpression(context: Rule.RuleContext, node: estree.Node) {
  if (node.type !== 'CallExpression') {
    return undefined;
  }
  return getFullyQualifiedName(context, node);
}
