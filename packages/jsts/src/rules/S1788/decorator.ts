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
// https://sonarsource.github.io/rspec/#/rspec/S1788/javascript

import { Rule } from 'eslint';
import { AssignmentPattern, BaseFunction } from 'estree';
import { isIdentifier } from '../helpers';
import { interceptReport } from '../helpers';

const NUM_ARGS_REDUX_REDUCER = 2;

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, reportExempting(isReduxReducer));
}

function reportExempting(
  exemptionCondition: (enclosingFunction: BaseFunction) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const node = reportDescriptor['node'] as AssignmentPattern;
      const scope = context.getScope();
      const variable = scope.variables.find(value => isIdentifier(node.left, value.name));
      const enclosingFunction = variable?.defs?.[0]?.node as BaseFunction;
      if (enclosingFunction && !exemptionCondition(enclosingFunction)) {
        context.report(reportDescriptor);
      }
    }
  };
}

function isReduxReducer(enclosingFunction: BaseFunction) {
  if (enclosingFunction.params.length === NUM_ARGS_REDUX_REDUCER) {
    const [firstParam, secondParam] = enclosingFunction.params;
    return (
      firstParam.type === 'AssignmentPattern' &&
      isIdentifier(firstParam.left, 'state') &&
      isIdentifier(secondParam, 'action')
    );
  }
  return false;
}
