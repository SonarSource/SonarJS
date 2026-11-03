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
import type { TSESTree } from '@typescript-eslint/utils';
import { unwrapTypeScriptExpression } from '../helpers/ast.js';

export function unwrapTypeScriptValue(expression: estree.Node): estree.Node {
  const value = unwrapTypeScriptExpression(expression);
  const tsValue = value as unknown as TSESTree.Node;
  return tsValue.type === 'TSInstantiationExpression'
    ? unwrapTypeScriptValue(tsValue.expression as unknown as estree.Node)
    : value;
}

/**
 * Get the property path of an expression rooted at `sap`, `require`, or `System`.
 *
 * `sap.ui.define` -> ['sap', 'ui', 'define']
 * `other.ui.define` -> undefined
 * `sap.ui['define']` -> ['sap', 'ui', 'define'] when `allowComputed` is true
 * `sap.ui[42]` -> ['sap', 'ui', '42'] when `allowComputed` is true
 * sap.ui[`unrelated`] -> ['sap', 'ui', 'unrelated'] when `allowComputed` is true
 * `sap.ui[key]` -> ['sap', 'ui', '*'] when `allowComputed` is true
 * `sap.ui[key]` -> undefined when `allowComputed` is false
 *
 * A `'*'` segment can match any property when the rule checks writes.
 */
export function getPropertyAccessPath(
  expression: estree.Node,
  allowComputed: boolean,
): string[] | undefined {
  const node = allowComputed ? unwrapTypeScriptValue(expression) : expression;
  if (allowComputed && node.type === 'ChainExpression') {
    return getPropertyAccessPath(node.expression, allowComputed);
  }
  if (node.type === 'Identifier') {
    return ['sap', 'require', 'System'].includes(node.name) ? [node.name] : undefined;
  }
  if (node.type !== 'MemberExpression' || (!allowComputed && (node.computed || node.optional))) {
    return undefined;
  }
  const object = getPropertyAccessPath(node.object, allowComputed);
  if (!object) {
    return undefined;
  }
  if (!node.computed && node.property.type === 'Identifier') {
    return [...object, node.property.name];
  }
  return [...object, getStaticPropertyName(node.property) ?? '*'];
}

function getStaticPropertyName(property: estree.Node): string | undefined {
  const value = unwrapTypeScriptValue(property);
  if (
    value.type === 'Literal' &&
    (typeof value.value === 'string' || typeof value.value === 'number')
  ) {
    return String(value.value);
  }
  if (value.type === 'TemplateLiteral' && value.expressions.length === 0) {
    return value.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}
