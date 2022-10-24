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

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getFullyQualifiedName } from '../module';
import { isMethodCall } from '../ast';

/**
 * A symbol fully qualified name, e.g. `aws-cdk-lib.aws_sns.Topic`.
 */
export type FullyQualifiedName = string;
export type AwsCdkCallback = {
  functionName: string;
  callExpression(expr: estree.CallExpression, ctx: Rule.RuleContext): void;
  newExpression?(expr: estree.NewExpression, ctx: Rule.RuleContext): void;
};
export type AwsCdkConsumer =
  | ((expr: estree.NewExpression, ctx: Rule.RuleContext) => void)
  | AwsCdkCallback;
type AwsCdkNode = estree.NewExpression | estree.CallExpression;

/**
 * A rule template for AWS CDK resources
 *
 * @param consumers callbacks to invoke when a new expression matches a fully qualified name
 * @param metadata the rule metadata
 * @returns the instantiated rule module
 */
export function AwsCdkTemplate(
  consumers: {
    [key: FullyQualifiedName]: AwsCdkConsumer;
  },
  metadata: { meta: Rule.RuleMetaData } = { meta: {} },
): Rule.RuleModule {
  return {
    ...metadata,
    create(ctx: Rule.RuleContext) {
      return {
        'NewExpression, CallExpression'(node: AwsCdkNode) {
          if (node.arguments.some(arg => arg.type === 'SpreadElement')) {
            return;
          }
          for (const fqn in consumers) {
            const normalizedExpectedFQN = fqn.replace(/-/g, '_');
            const callback = consumers[fqn];
            if (typeof callback === 'object' || node.type === 'CallExpression') {
              executeIfMatching(node, normalizedExpectedFQN, callback);
              continue;
            }
            const normalizedActualFQN = getFullyQualifiedName(ctx, node.callee)?.replace(/-/g, '_');
            if (normalizedActualFQN === normalizedExpectedFQN) {
              callback(node, ctx);
            }
          }
        },
      };

      function executeIfMatching(node: AwsCdkNode, expected: string, callback: AwsCdkConsumer) {
        if (typeof callback === 'function') {
          return;
        }

        if (node.type === 'NewExpression') {
          const fqn = getFullyQualifiedName(ctx, node.callee)?.replace(/-/g, '_');
          if (fqn === expected) {
            callback.newExpression?.(node, ctx);
          }
        } else if (isMethodCall(node)) {
          const fqn = getFullyQualifiedName(ctx, node.callee.object)?.replace(/-/g, '_');
          const callee = node.callee.property.name;
          if (fqn === expected && callee === callback.functionName) {
            callback.callExpression(node, ctx);
          }
        }
      }
    },
  };
}
