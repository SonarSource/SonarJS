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
// https://sonarsource.github.io/rspec/#/rspec/S6308/javascript

import {Rule} from 'eslint';
import {AwsCdkTemplate} from './helpers/aws/cdk';
import {Expression, Identifier, Literal, MemberExpression, NewExpression, Node, ObjectExpression, Property, SpreadElement,} from 'estree';
import {getUniqueWriteUsage, isDotNotation, isIdentifier, isLiteral, isProperty, isUndefined,} from './helpers';

const QUEUE_PROPS_POSITION = 2;

interface QueueCheckerOptions {
  encryptionProperty: string;
  hasUnencryptedValue: boolean;
}

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-sqs.Queue': queueChecker({
      encryptionProperty: 'encryption',
      hasUnencryptedValue: true
    }),
    'aws-cdk-lib.aws-sqs.CfnQueue': queueChecker({
      encryptionProperty: 'kmsMasterKeyId',
      hasUnencryptedValue: false
    }),
  },
  {
    meta: {
      messages: {
        encryptionDisabled: 'Setting {{encryptionProperty}} to QueueEncryption.UNENCRYPTED disables SQS queues encryption. ' +
          'Make sure it is safe here.',
        encryptionOmitted:
          'Omitting {{encryptionProperty}} disables SQS queues encryption. Make sure it is safe here.',
      },
    },
  },
);

function queueChecker(options: QueueCheckerOptions) {
  return (expr: NewExpression, ctx: Rule.RuleContext) => {
    const argument = queryArgument(expr, QUEUE_PROPS_POSITION).notUndefined().ofType('ObjectExpression');
    const encryptionProperty = queryEncryptionProperty(argument, options.encryptionProperty);

    if (encryptionProperty.isMissing) {
      ctx.report({
        messageId: 'encryptionOmitted',
        node: encryptionProperty.node,
        data: {
          encryptionProperty: options.encryptionProperty,
        },
      });
    } else if (encryptionProperty.isFound && isUnencrypted(encryptionProperty.node, options)) {
      ctx.report({
        messageId: 'encryptionDisabled',
        node: encryptionProperty.node,
        data: {
          encryptionProperty: options.encryptionProperty,
        },
      });
    }

    function isUnencrypted(node: Node, options: QueueCheckerOptions) {
      if (options.hasUnencryptedValue && isMemberIdentifier(node)) {
        const className = node.object.type === 'Identifier' ? node.object.name : node.object.property.name;
        const constantName = node.property.name;
        return className === 'QueueEncryption' && constantName == 'UNENCRYPTED';
      } else {
        return !options.hasUnencryptedValue && isUndefined(node);
      }
    }

    function queryEncryptionProperty(argument: Result, propertyName: string) {
      return argument
        .map((object: ObjectExpression) => queryProperty(object, propertyName))
        .map((property: Property) => property.value)
        .notUndefined();
    }

    function queryArgument(node: NewExpression, position: number) {
      const expression = getExpressionAtPosition(node.arguments, position);
      if (expression == null) {
        return missing(node);
      } else if (expression.type === 'SpreadElement') {
        return unknown(node);
      } else {
        return new FoundResult(expression);
      }
    }

    function queryProperty(node: ObjectExpression, name: string): Result {
      let property: Property | null = null;
      let hasUnknownSpreadElement = false;
      let index = node.properties.length - 1;

      while (index >= 0 && property == null) {
        const element = node.properties[index];
        if (isIdentifierProperty(element, name)) {
          property = element;
        } else if (isSpreadIdentifier(element)) {
          const usage = getUniqueWriteUsage(ctx, element.argument.name);
          if (usage && usage.type === 'ObjectExpression') {
            property = queryProperty(usage, name).as('Property');
          } else {
            hasUnknownSpreadElement = true;
          }
        }
        index--;
      }

      if (property == null) {
        return hasUnknownSpreadElement ? unknown(node) : missing(node);
      } else {
        return new FoundResult(property);
      }
    }

    function queryValue(node: Node, type: 'string' | 'boolean') {
      if (isLiteral(node)) {
        return queryValueFromLiteral(node, type);
      } else if (isIdentifier(node)) {
        return queryValueFromIdentifier(node, type);
      } else {
        return unknown(node);
      }
    }

    function queryValueFromLiteral(node: Literal, type: 'string' | 'boolean') {
      if (typeof node.value !== type) {
        return unknown(node);
      }
      return found(node);
    }

    function queryValueFromIdentifier(node: Identifier, type: 'string' | 'boolean'): Result {
      if (isUndefined(node)) {
        return missing(node);
      }

      const usage = getUniqueWriteUsage(ctx, node.name);
      if (!usage) {
        return unknown(node);
      }

      return queryValue(usage, type).withNodeIfNotFound(node);
    }
  };
}

class Result {
  constructor(readonly node: Node, readonly status: 'missing' | 'unknown' | 'found') {}

  get isFound() {
    return this.status === 'found';
  }

  get isMissing() {
    return this.status === 'missing';
  }

  as<N extends Node>(_type: N['type']): N | null {
    return null;
  }

  map<N extends Node>(_closure: (node: N) => Result | Node): Result {
    return this;
  }

  ofType(_type: string): Result {
    return this;
  }

  withNodeIfNotFound(node: Node): Result {
    return !this.isFound ? new Result(node, this.status) : this;
  }

  notUndefined(): Result {
    return this.isFound && !isUndefined(this.node) ? this : missing(this.node);
  }
}

class FoundResult extends Result {
  constructor(value: Node) {
    super(value, 'found');
  }

  as<N extends Node>(type: N['type']): N | null {
    return this.status === 'found' && this.node.type === type ? (this.node as N) : null;
  }

  map<N extends Node>(closure: (node: N) => Result | Node): Result {
    const resultOrNode = closure(this.node as N);
    return resultOrNode instanceof Result ? resultOrNode : found(resultOrNode);
  }

  ofType(type: string): Result {
    return this.node.type === type ? this : unknown(this.node);
  }
}

function unknown(node: Node): Result {
  return new Result(node, 'unknown');
}

function missing(node: Node): Result {
  return new Result(node, 'missing');
}

function found(node: Node) {
  return new FoundResult(node);
}

type MemberIdentifier = MemberExpression & {
  object: Identifier | (MemberExpression & { property: Identifier });
  property: Identifier;
};

function isMemberIdentifier(node: Node): node is MemberIdentifier {
  return isDotNotation(node) && (isIdentifier(node.object) || isDotNotation(node.object));
}

function isSpreadIdentifier(
  node: Property | SpreadElement,
): node is SpreadElement & { argument: Identifier } {
  return node.type === 'SpreadElement' && node.argument.type === 'Identifier';
}

function isIdentifierProperty(node: Property | SpreadElement, name: string): node is Property {
  return isProperty(node) && isPropertyName(node.key, name);
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
