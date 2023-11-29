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
// https://sonarsource.github.io/rspec/#/rspec/S2187/javascript

import { Rule } from 'eslint';
import { Node } from 'estree';

const APIs = new Set([
  // Jasmine
  'it',
  'fit',
  'xit',
  // Jest
  'it',
  'it.concurrent',
  'it.concurrent.each',
  'it.concurrent.only.each',
  'it.concurrent.skip.each',
  'it.each',
  'it.failing',
  'it.failing.each',
  'it.only.failing',
  'it.skip.failing',
  'it.only',
  'it.only.each',
  'it.skip',
  'it.skip.each',
  'it.todo',
  'test',
  'test.concurrent',
  'test.concurrent.each',
  'test.concurrent.only.each',
  'test.concurrent.skip.each',
  'test.each',
  'test.failing',
  'test.failing.each',
  'test.only.failing',
  'test.skip.failing',
  'test.only',
  'test.only.each',
  'test.skip',
  'test.skip.each',
  'test.todo',
  // Mocha
  'it',
  'it.skip',
  'it.only',
  'test',
  'test.skip',
  'test.only',
  // Node.js
  'it',
  'it.skip',
  'it.todo',
  'it.only',
  'test',
  'test.skip',
  'test.todo',
  'test.only',
]);

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      missingTest: 'Add some tests to this file.',
    },
  },
  create(context: Rule.RuleContext) {
    const { filename } = context;
    if (!/\.spec\.|\.test\./.exec(filename)) {
      return {};
    }

    let hasTest = false;
    return {
      CallExpression(node) {
        if (hasTest) {
          return;
        }

        const fqn = fullyQualifiedName(node.callee);
        if (APIs.has(fqn)) {
          hasTest = true;
        }
      },
      'Program:exit'() {
        if (!hasTest) {
          context.report({
            messageId: 'missingTest',
            loc: { line: 0, column: 0 },
          });
        }
      },
    };
  },
};

function fullyQualifiedName(node: Node): string {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'MemberExpression':
      return `${fullyQualifiedName(node.object)}.${fullyQualifiedName(node.property)}`;
    default:
      return '';
  }
}
