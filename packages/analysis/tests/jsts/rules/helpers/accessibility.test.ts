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
import { parseForESLint } from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXOpeningElement } from 'estree-jsx';
import { expect } from 'expect';
import { describe, it } from 'node:test';
import {
  getRole,
  hasAccessibleNameAttribute,
} from '../../../../src/jsts/rules/helpers/accessibility.js';

describe('getRole', () => {
  it('returns a normalized literal role', () => {
    expect(getRole(parseOpeningElement('<div role="LISTBOX" />'))).toBe('listbox');
    expect(getRole(parseOpeningElement('<div role={"OPTION"} />'))).toBe('option');
  });

  it('returns null for absent and non-literal roles', () => {
    expect(getRole(parseOpeningElement('<div />'))).toBeNull();
    expect(getRole(parseOpeningElement('<div role={role} />'))).toBeNull();
  });
});

describe('hasAccessibleNameAttribute', () => {
  it('accepts non-empty static, dynamic, and template-literal values', () => {
    expect(hasAccessibleName('<img alt="Description" />', 'alt')).toBe(true);
    expect(hasAccessibleName('<div aria-label={"Description"} />', 'aria-label')).toBe(true);
    expect(hasAccessibleName('<div aria-labelledby={labelId} />', 'aria-labelledby')).toBe(true);
    expect(hasAccessibleName('<div aria-label={`Description for ${name}`} />', 'aria-label')).toBe(
      true,
    );
  });

  it('rejects absent, empty, and nullish values', () => {
    expect(hasAccessibleName('<div />', 'aria-label')).toBe(false);
    expect(hasAccessibleName('<div aria-label="   " />', 'aria-label')).toBe(false);
    expect(hasAccessibleName('<div aria-label={null} />', 'aria-label')).toBe(false);
    expect(hasAccessibleName('<div aria-label={undefined} />', 'aria-label')).toBe(false);
    expect(hasAccessibleName('<div aria-label={``} />', 'aria-label')).toBe(false);
  });
});

function hasAccessibleName(sourceCode: string, name: string): boolean {
  const openingElement = parseOpeningElement(sourceCode) as JSXOpeningElement;
  return hasAccessibleNameAttribute(openingElement.attributes, name);
}

function parseOpeningElement(sourceCode: string): TSESTree.JSXOpeningElement {
  const { ast } = parseForESLint(sourceCode, {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2020,
    sourceType: 'module',
  });
  const statement = ast.body[0];
  if (statement?.type !== 'ExpressionStatement' || statement.expression.type !== 'JSXElement') {
    throw new Error('Expected a JSX element');
  }
  return statement.expression.openingElement;
}
