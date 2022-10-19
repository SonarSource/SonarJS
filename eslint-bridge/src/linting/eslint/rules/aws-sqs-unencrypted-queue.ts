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

import { Rule } from 'eslint';
import { AwsCdkTemplate } from './helpers/aws/cdk';
import {
  Identifier,
  MemberExpression,
  NewExpression,
  Node,
  ObjectExpression,
  Property,
} from 'estree';
import {
  getProperty,
  getValueOfExpression,
  isDotNotation,
  isIdentifier,
  isUndefined,
} from './helpers';

const QUEUE_PROPS_POSITION = 2;

interface QueueCheckerOptions {
  encryptionProperty: string;
  hasUnencryptedValue: boolean;
}

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-sqs.Queue': queueChecker({
      encryptionProperty: 'encryption',
      hasUnencryptedValue: true,
    }),
    'aws-cdk-lib.aws-sqs.CfnQueue': queueChecker({
      encryptionProperty: 'kmsMasterKeyId',
      hasUnencryptedValue: false,
    }),
  },
  {
    meta: {
      messages: {
        encryptionDisabled:
          'Setting {{encryptionProperty}} to QueueEncryption.UNENCRYPTED disables SQS queues encryption. ' +
          'Make sure it is safe here.',
        encryptionOmitted:
          'Omitting {{encryptionProperty}} disables SQS queues encryption. Make sure it is safe here.',
      },
    },
  },
);

function queueChecker(options: QueueCheckerOptions) {
  return (expr: NewExpression, ctx: Rule.RuleContext) => {
    const argument = queryArgument(expr, QUEUE_PROPS_POSITION)
      .notUndefined()
      .ofType('ObjectExpression');
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
        const className =
          node.object.type === 'Identifier' ? node.object.name : node.object.property.name;
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
      const argument = node.arguments[position];
      if (argument == null) {
        return missing(node);
      } else if (isUndefined(argument)) {
        return missing(argument);
      }

      const expression = getValueOfExpression(ctx, argument, 'ObjectExpression');
      return expression == null ? unknown(node) : found(expression);
    }

    function queryProperty(node: ObjectExpression, name: string): Result {
      const property = getProperty(node, name, ctx);
      if (property === undefined) {
        return unknown(node);
      } else if (property === null) {
        return missing(node);
      } else {
        return found(property);
      }
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

  map<N extends Node>(_closure: (node: N) => Result | Node): Result {
    return this;
  }

  ofType(_type: string): Result {
    return this;
  }

  notUndefined(): Result {
    if (this.isFound) {
      return isUndefined(this.node) ? missing(this.node) : this;
    } else {
      return this;
    }
  }
}

class FoundResult extends Result {
  constructor(value: Node) {
    super(value, 'found');
  }

  map<N extends Node>(closure: (node: N) => Result | Node): Result {
    const resultOrNode = closure(this.node as N);
    return resultOrNode instanceof Result ? resultOrNode : found(resultOrNode);
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
