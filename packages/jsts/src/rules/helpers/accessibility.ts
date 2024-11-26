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

import pkg from 'jsx-ast-utils';
const { getProp, getLiteralPropValue, elementType } = pkg;
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';

export function isPresentationTable(context: Rule.RuleContext, node: TSESTree.JSXOpeningElement) {
  const DISALLOWED_VALUES = ['presentation', 'none'];
  const type = getElementType(context)(node);
  if (type.toLowerCase() !== 'table') {
    return false;
  }
  const role = getProp(node.attributes, 'role');
  if (!role) {
    return false;
  }
  const roleValue = String(getLiteralPropValue(role));

  return DISALLOWED_VALUES.includes(roleValue?.toLowerCase());
}

export const getElementType = (
  context: Rule.RuleContext,
): ((node: TSESTree.JSXOpeningElement) => string) => {
  const { settings } = context;
  const polymorphicPropName = settings['jsx-a11y']?.polymorphicPropName;
  const polymorphicAllowList = settings['jsx-a11y']?.polymorphicAllowList;

  const componentMap = settings['jsx-a11y']?.components;

  return (node: TSESTree.JSXOpeningElement): string => {
    const polymorphicProp = polymorphicPropName
      ? getLiteralPropValue(getProp(node.attributes, polymorphicPropName))
      : undefined;

    let rawType: string = elementType(node);
    if (polymorphicProp && (!polymorphicAllowList || polymorphicAllowList.includes(rawType))) {
      rawType = `${polymorphicProp}`;
    }

    if (!componentMap) {
      return rawType;
    }

    return componentMap.hasOwnProperty(rawType) ? componentMap[rawType] : rawType;
  };
};
