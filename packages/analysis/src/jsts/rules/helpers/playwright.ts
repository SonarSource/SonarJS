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
import type estree from 'estree';
import { isIdentifier } from './ast.js';

const describeModifiers = ['parallel', 'serial'];
const EXPECT_FQN_ROOTS = [
  '@playwright.test.test.expect', // test.expect alias
  '@playwright.test.expect', // import { expect } from '@playwright/test'
];

export function isDescribe(node: estree.Node | undefined): boolean {
  if (node?.type !== 'MemberExpression' || node.computed) {
    return false;
  }

  const { object, property } = node;
  return (
    (isIdentifier(object, 'test') && isIdentifier(property, 'describe')) ||
    (isIdentifier(property, ...describeModifiers) && isDescribe(object))
  );
}

// Prefix match covers static helpers like `.soft`, `.poll`, and `.configure`.
// `.replaceAll('/', '.')` normalizes the scoped-package slash that
// getFullyQualifiedNameTS preserves (e.g. '@playwright/test') while ESTree FQNs use dots.
export function isExpectFqn(fqn: string | null | undefined): boolean {
  if (!fqn) {
    return false;
  }
  const normalized = fqn.replaceAll('/', '.');
  return EXPECT_FQN_ROOTS.some(root => normalized === root || normalized.startsWith(`${root}.`));
}
