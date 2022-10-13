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

type QueryResult<T> =
  | { node: Node; type: 'missing' | 'unknown' }
  | { node: Node; type: 'found'; result: T };

const messages = {
  encryptionDisabled: 'Make sure that using unencrypted volumes is safe here.',
  encryptionOmitted: 'Omitting "encrypted" disables volumes encryption. Make sure it is safe here.',
};

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-ec2.Volume': argumentPropertyChecker(2, 'encrypted'),
  },
  {
    meta: {
      messages,
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

function checkArgumentProperty(options: ArgumentPropertyCheckerOptions) {
  function report(messageId: string, node: Node) {
    options.ctx.report({ messageId, node });
  }

  function reportOrGetValue<T>(result: QueryResult<T>): T | null {
    if (result.type === 'missing') {
      report('encryptionOmitted', result.node);
      return null;
    } else if (result.type === 'found') {
      return result.result;
    } else {
      return null;
    }
  }

  function getExpressionAt(args: Array<Expression | SpreadElement>, position: number) {
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

  function queryArgument(node: NewExpression, position: number): QueryResult<ObjectExpression> {
    const result = getExpressionAt(node.arguments, position);
    if (result?.type === 'ObjectExpression') {
      return { node, type: 'found', result };
    } else {
      return { node, type: result == null ? 'missing' : 'unknown' };
    }
  }

  function queryProperty(node: ObjectExpression, name: string): QueryResult<Property> {
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

    if (property != null) {
      return { node, type: 'found', result: property };
    } else if (hasSpreadElement) {
      return { node, type: 'unknown' };
    } else {
      return { node, type: 'missing' };
    }
  }

  function queryBooleanFromLiteral(node: Literal): QueryResult<boolean> {
    if (typeof node.value === 'boolean') {
      return { node, type: 'found', result: node.value };
    } else {
      return { node, type: 'unknown' };
    }
  }

  function queryBooleanFromIdentifier(node: Identifier): QueryResult<boolean> {
    if (isUndefined(node)) {
      return { node, type: 'missing' };
    }

    const usage = getUniqueWriteUsage(options.ctx, node.name);
    if (!usage) {
      return { node, type: 'unknown' };
    }

    const result = queryBoolean(usage);
    result.node = node;
    return result;
  }

  function queryBoolean(node: Node): QueryResult<boolean> {
    if (isLiteral(node)) {
      return queryBooleanFromLiteral(node);
    } else if (isIdentifier(node)) {
      return queryBooleanFromIdentifier(node);
    } else {
      return { node, type: 'unknown' };
    }
  }

  const argument = reportOrGetValue(queryArgument(options.expr, options.argumentPosition));
  if (argument == null) {
    return;
  }

  const property = reportOrGetValue(queryProperty(argument, options.propertyName));
  if (property == null) {
    return;
  }

  const bool = reportOrGetValue(queryBoolean(property.value));
  if (bool == null) {
    return;
  }

  if (!bool) {
    report('encryptionDisabled', property.value);
  }
}

function isPropertyName(node: Node, name: string) {
  return (isLiteral(node) && node.value === name) || isIdentifier(node, name);
}
