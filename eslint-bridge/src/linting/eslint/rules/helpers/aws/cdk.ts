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

/**
 * A symbol fully qualified name, e.g. `aws-cdk-lib.aws_sns.Topic`.
 */
export type FullyQualifiedName = string;

/**
 * A rule template for AWS CDK resources
 *
 * @param consumers callbacks to invoke when a new expression matches a fully qualified name
 * @param metadata the rule metadata
 * @returns the instantiated rule module
 */
export function AwsCdkTemplate(
  consumers: {
    [key: FullyQualifiedName]: (expr: estree.NewExpression, ctx: Rule.RuleContext) => void;
  },
  metadata: { meta: Rule.RuleMetaData } = { meta: {} },
): Rule.RuleModule {
  return {
    ...metadata,
    create(ctx: Rule.RuleContext) {
      return {
        NewExpression(node: estree.NewExpression) {
          if (node.arguments.some(arg => arg.type === 'SpreadElement')) {
            return;
          }
          for (const fqn in consumers) {
            const normalizedExpectedFQN = fqn.replace(/-/g, '_');
            const normalizedActualFQN = getFullyQualifiedName(ctx, node.callee)?.replace(/-/g, '_');
            if (normalizedActualFQN === normalizedExpectedFQN) {
              const callback = consumers[fqn];
              callback(node, ctx);
            }
          }
        },
      };
    },
  };
}
