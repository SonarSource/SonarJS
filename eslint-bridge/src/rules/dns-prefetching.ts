/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-5743

import { Rule } from 'eslint';
import * as estree from 'estree';
import { checkSensitiveCall, isCallToFQN, getModuleNameOfNode } from '../utils';

const MESSAGE = 'Make sure allowing browsers to perform DNS prefetching is safe here.';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        const { callee } = callExpression;
        if (isCallToFQN(context, callExpression, 'helmet', 'dnsPrefetchControl')) {
          checkSensitiveCall(context, callExpression, 0, 'allow', true, MESSAGE);
        }
        const calledModule = getModuleNameOfNode(context, callee);
        if (calledModule?.value === 'helmet') {
          checkSensitiveCall(context, callExpression, 0, 'dnsPrefetchControl', false, MESSAGE);
        }
        if (calledModule?.value === 'dns-prefetch-control') {
          checkSensitiveCall(context, callExpression, 0, 'allow', true, MESSAGE);
        }
      },
    };
  },
};
