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
// https://sonarsource.github.io/rspec/#/rspec/S6275/javascript

import { Rule } from 'eslint';
import {
  AwsCdkTemplate,
  getUniqueWriteUsage,
  isIdentifier,
  isLiteral,
  isUndefined,
} from './helpers';
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

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-ec2.Volume': argumentPropertyChecker(2, 'encrypted'),
  },
  {
    meta: {
      messages: {
        encryptionDisabled: 'Make sure that using unencrypted volumes is safe here.',
        encryptionOmitted:
          'Omitting "encrypted" disables volumes encryption. Make sure it is safe here.',
      },
    },
  },
);

interface ArgumentPropertyCheckerOptions {
  expr: NewExpression;
  ctx: Rule.RuleContext;
  argumentPosition: number;
  propertyName: string;
}

function argumentPropertyChecker(argumentPosition: number, propertyName: string) {
  return (expr: NewExpression, ctx: Rule.RuleContext) =>
    checkArgumentProperty({
      expr,
      ctx,
      argumentPosition,
      propertyName,
    });
}

class QueryError extends Error {
  constructor(readonly node: Node, readonly type: 'missing' | 'unknown') {
    super();
  }
}

function checkArgumentProperty(options: ArgumentPropertyCheckerOptions) {
  try {
    const argument = queryArgument(options.expr, options.argumentPosition);
    const property = queryProperty(argument, options.propertyName);
    const bool = queryBoolean(property.value);

    if (!bool) {
      report('encryptionDisabled', property.value);
    }
  } catch (e) {
    if (!(e instanceof QueryError)) {
      throw e;
    }
    if (e.type === 'missing') {
      report('encryptionOmitted', e.node);
    }
  }

  function report(messageId: string, node: Node) {
    options.ctx.report({ messageId, node });
  }

  function queryArgument(node: NewExpression, position: number): ObjectExpression {
    const expression = getExpressionAtPosition(node.arguments, position);
    if (expression?.type !== 'ObjectExpression') {
      throw new QueryError(node, expression == null ? 'missing' : 'unknown');
    }
    return expression;
  }

  function queryProperty(node: ObjectExpression, name: string): Property {
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
      throw new QueryError(node, hasSpreadElement ? 'unknown' : 'missing');
    }

    return property;
  }

  function queryBoolean(node: Node): boolean {
    if (isLiteral(node)) {
      return queryBooleanFromLiteral(node);
    } else if (isIdentifier(node)) {
      return queryBooleanFromIdentifier(node);
    } else {
      throw new QueryError(node, 'unknown');
    }
  }

  function queryBooleanFromLiteral(node: Literal): boolean {
    if (typeof node.value !== 'boolean') {
      throw new QueryError(node, 'unknown');
    }
    return node.value;
  }

  function queryBooleanFromIdentifier(node: Identifier): boolean {
    if (isUndefined(node)) {
      throw new QueryError(node, 'missing');
    }

    const usage = getUniqueWriteUsage(options.ctx, node.name);
    if (!usage) {
      throw new QueryError(node, 'unknown');
    }

    try {
      return queryBoolean(usage);
    } catch (e) {
      if (e instanceof QueryError) {
        throw new QueryError(node, e.type);
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
