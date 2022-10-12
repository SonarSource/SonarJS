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
          for (const fqn in consumers) {
            if (hasFullyQualifiedName(node, fqn, ctx)) {
              const callback = consumers[fqn];
              callback(node, ctx);
            }
          }
        },
      };
    },
  };
}

/**
 * Checks if the underlying symbol of a node matches a fully qualified name.
 *
 * @param _node the node to check
 * @param _fqn the fully qualified name to test
 * @param _ctx the context of the node
 * @returns true if the node matches the fully qualified name, false otherwise.
 */
function hasFullyQualifiedName(
  _node: estree.Node,
  _fqn: FullyQualifiedName,
  _ctx: Rule.RuleContext,
) {
  /* TODO not implemented yet */
  return false;
}
