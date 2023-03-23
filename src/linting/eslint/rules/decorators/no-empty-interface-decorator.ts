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
// https://sonarsource.github.io/rspec/#/rspec/S4023/javascript

import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { interceptReport } from './helpers';

// core implementation of this rule raises issues on empty interface extending TypeScript utility types
export function decorateNoEmptyInterface(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, (context, reportDescriptor) => {
    const id = (reportDescriptor as any).node as TSESTree.Identifier;
    const decl = id.parent as TSESTree.TSInterfaceDeclaration;
    if (decl.extends?.length === 1 && isUtilityType(decl.extends[0])) {
      return;
    }
    context.report(reportDescriptor);
  });
}

/**
 * TypeScript provides a set of utility types to facilitate type transformations.
 * @see https://www.typescriptlang.org/docs/handbook/utility-types.html
 */
const UtilityTypes = new Set([
  'Awaited',
  'Partial',
  'Required',
  'Readonly',
  'Record',
  'Pick',
  'Omit',
  'Exclude',
  'Extract',
  'NonNullable',
  'Parameters',
  'ConstructorParameters',
  'ReturnType',
  'InstanceType',
  'ThisParameterType',
  'OmitThisParameter',
  'ThisType',
  'Uppercase',
  'Lowercase',
  'Capitalize',
  'Uncapitalize',
]);

function isUtilityType(node: TSESTree.TSInterfaceHeritage) {
  return node.expression.type === 'Identifier' && UtilityTypes.has(node.expression.name);
}
