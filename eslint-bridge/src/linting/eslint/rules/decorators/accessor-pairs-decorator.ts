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
import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { interceptReport } from './helpers';

export function decorateAccessorPairs(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, reportExempting(isDecoratedSetterWithAngularInput));
}

function reportExempting(
  exemptionCondition: (def: TSESTree.MethodDefinition) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const def = reportDescriptor['node'] as TSESTree.MethodDefinition;
      if (!exemptionCondition(def)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function isDecoratedSetterWithAngularInput(def: TSESTree.MethodDefinition) {
  const { kind, decorators } = def;
  return (
    kind === 'set' &&
    decorators !== undefined &&
    decorators.some(
      decorator =>
        decorator.expression.type === 'CallExpression' &&
        decorator.expression.callee.type === 'Identifier' &&
        decorator.expression.callee.name === 'Input',
    )
  );
}
