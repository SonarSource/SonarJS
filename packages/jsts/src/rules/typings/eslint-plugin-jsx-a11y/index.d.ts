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
declare module 'eslint-plugin-jsx-a11y' {
  import { Rule } from 'eslint';
  export const rules: { [name: string]: Rule.RuleModule };
}
declare module 'eslint-plugin-jsx-a11y/lib/util/getElementType' {
  import { TSESTree } from '@typescript-eslint/utils';
  type ESLintSettings = {
    [key: string]: mixed;
    'jsx-a11y'?: {
      polymorphicPropName?: string;
      components?: { [key: string]: string };
    };
  };

  type ESLintContext = {
    options: Array<Object>;
    report: (ESLintReport) => void;
    settings: ESLintSettings;
  };

  const getElementType = (context: ESLintContext): ((node: TSESTree.JSXOpeningElement) => string) =>
    boolean;

  export default getElementType;
}

declare module 'eslint-plugin-jsx-a11y/lib/util/isHiddenFromScreenReader' {
  const isHiddenFromScreenReader = (
    type: string,
    attributes: (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[],
  ) => boolean;
  export default isHiddenFromScreenReader;
}

declare module 'eslint-plugin-jsx-a11y/lib/util/hasAccessibleChild' {
  const hasAccessibleChild = (node: JSXElement, elementType: (JSXOpeningElement) => string) =>
    boolean;
  export default hasAccessibleChild;
}
