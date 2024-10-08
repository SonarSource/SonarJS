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
// https://sonarsource.github.io/rspec/#/rspec/S3686/javascript

import { Rule, Scope } from 'eslint';
import estree from 'estree';
import {
  generateMeta,
  getVariableFromName,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),

  create(context: Rule.RuleContext) {
    const usedInNew: Map<Scope.Variable, estree.SimpleCallExpression> = new Map();
    const usedInCall: Map<Scope.Variable, estree.SimpleCallExpression> = new Map();
    const hasIssue: Scope.Variable[] = [];

    return {
      NewExpression: (node: estree.Node) => {
        checkExpression(
          node as estree.SimpleCallExpression,
          usedInNew,
          usedInCall,
          hasIssue,
          'out',
          context,
        );
      },
      CallExpression: (node: estree.Node) => {
        checkExpression(
          node as estree.SimpleCallExpression,
          usedInCall,
          usedInNew,
          hasIssue,
          '',
          context,
        );
      },
    };
  },
};

function checkExpression(
  callExpression: estree.SimpleCallExpression,
  thisTypeUsageMap: Map<Scope.Variable, estree.SimpleCallExpression>,
  otherTypeUsageMap: Map<Scope.Variable, estree.SimpleCallExpression>,
  hasIssue: Scope.Variable[],
  tail: string,
  context: Rule.RuleContext,
) {
  const variable = getVariable(callExpression, context);
  if (variable && variable.defs.length !== 0) {
    const otherTypeUsage = otherTypeUsageMap.get(variable);
    if (otherTypeUsage?.loc && !hasIssue.includes(variable)) {
      const message =
        `Correct the use of this function; ` +
        `on line ${otherTypeUsage.loc.start.line} it was called with${tail} "new".`;

      report(
        context,
        {
          node: callExpression.callee,
          message,
        },
        [toSecondaryLocation(otherTypeUsage.callee)],
      );

      hasIssue.push(variable);
    } else {
      thisTypeUsageMap.set(variable, callExpression);
    }
  }
}

function getVariable(node: estree.SimpleCallExpression, context: Rule.RuleContext) {
  if (node.callee.type === 'Identifier') {
    return getVariableFromName(context, node.callee.name, node);
  }
  return undefined;
}
