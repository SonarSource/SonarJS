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
import {
  Expression,
  Identifier,
  Literal,
  NewExpression,
  Node,
  ObjectExpression,
  Property,
  SpreadElement,
} from 'estree';
import { getFullyQualifiedName } from '../module';
import { getUniqueWriteUsage, isIdentifier, isLiteral, isUndefined } from '../ast';

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

export class AwsCdkQueryError extends Error {
  constructor(readonly node: Node, readonly type: 'missing' | 'unknown') {
    super();
  }
}

export class AwsCdkHelper {
  constructor(private readonly ctx: Rule.RuleContext) {}

  static checker(callback: (helper: AwsCdkHelper, expr: NewExpression) => void) {
    return (expr: NewExpression, ctx: Rule.RuleContext) => {
      const helper = new AwsCdkHelper(ctx);
      callback(helper, expr);
    };
  }

  report(descriptor: Rule.ReportDescriptor) {
    this.ctx.report(descriptor);
  }

  queryArgument(node: NewExpression, position: number): ObjectExpression {
    const expression = getExpressionAtPosition(node.arguments, position);
    if (expression?.type !== 'ObjectExpression') {
      throw new AwsCdkQueryError(node, expression == null ? 'missing' : 'unknown');
    }
    return expression;
  }

  queryProperty(node: ObjectExpression, name: string): Property {
    let property: Property | null = null;
    let hasSpreadElement = false;
    let index = 0;

    while (index < node.properties.length && property == null) {
      const element = node.properties[index];
      if (element.type === 'Property' && isPropertyName(element.key, name)) {
        property = element;
      } else if (element.type === 'SpreadElement') {
        hasSpreadElement = true;
      }
      index++;
    }

    if (property == null) {
      throw new AwsCdkQueryError(node, hasSpreadElement ? 'unknown' : 'missing');
    }

    return property;
  }

  queryBoolean(node: Node): boolean {
    if (isLiteral(node)) {
      return this.queryBooleanFromLiteral(node);
    } else if (isIdentifier(node)) {
      return this.queryBooleanFromIdentifier(node);
    } else {
      throw new AwsCdkQueryError(node, 'unknown');
    }
  }

  queryBooleanFromLiteral(node: Literal): boolean {
    if (typeof node.value !== 'boolean') {
      throw new AwsCdkQueryError(node, 'unknown');
    }
    return node.value;
  }

  queryBooleanFromIdentifier(node: Identifier): boolean {
    if (isUndefined(node)) {
      throw new AwsCdkQueryError(node, 'missing');
    }

    const usage = getUniqueWriteUsage(this.ctx, node.name);
    if (!usage) {
      throw new AwsCdkQueryError(node, 'unknown');
    }

    try {
      return this.queryBoolean(usage);
    } catch (e) {
      if (e instanceof AwsCdkQueryError) {
        throw new AwsCdkQueryError(node, e.type);
      } else {
        throw e;
      }
    }
  }
}

function isPropertyName(node: Node, name: string) {
  return (isLiteral(node) && node.value === name) || isIdentifier(node, name);
}

function getExpressionAtPosition(args: Array<Expression | SpreadElement>, position: number) {
  let index = 0;
  let expression: Expression | SpreadElement | null = null;

  while (index <= position && index < args.length && args[index].type !== 'SpreadElement') {
    expression = args[index];
    index++;
  }

  if (index > position && expression != null) {
    return expression;
  } else if (index < args.length) {
    return args[index];
  } else {
    return null;
  }
}
