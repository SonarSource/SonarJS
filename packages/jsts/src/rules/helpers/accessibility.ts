/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
