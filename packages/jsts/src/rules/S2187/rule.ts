/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2187/javascript

import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

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
  // vitest
  'test.runIf',
  'it.runIf',
  'test.for',
  'it.for',
  // eslint rule tester
  'ruleTester.run',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      missingTest: 'Add some tests to this file or delete it.',
    },
  }),
  create(context: Rule.RuleContext) {
    const { filename } = context;
    if (!/\.spec\.|\.test\./.test(filename)) {
      return {};
    }

    let hasTest = false;

    function checkIfTestCall(node: Node) {
      if (hasTest) {
        return;
      }

      const fqn = fullyQualifiedName(node);
      if (APIs.has(fqn)) {
        hasTest = true;
      }
    }

    return {
      CallExpression(node) {
        checkIfTestCall(node.callee);
      },
      TaggedTemplateExpression(node) {
        checkIfTestCall(node.tag);
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
