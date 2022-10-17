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
  Expression,
  Identifier,
  Literal,
  NewExpression,
  Node,
  ObjectExpression,
  Property,
  SpreadElement,
} from 'estree';
import { getUniqueWriteUsage, isIdentifier, isLiteral, isUndefined } from './helpers';

const DOMAIN_PROPS_POSITION = 2;
const ENABLED_PROPERTY = 'enabled';
const OPEN_SEARCH = 'OpenSearch';

interface DomainCheckerOptions {
  encryptionProperty: string;
  version: {
    property: string;
  };
}

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-opensearchservice.Domain': domainChecker({
      encryptionProperty: 'encryptionAtRest',
      version: {
        property: 'version',
      },
    }),
    'aws-cdk-lib.aws-opensearchservice.CfnDomain': domainChecker({
      encryptionProperty: 'encryptionAtRestOptions',
      version: {
        property: 'version',
      },
    }),
  },
  {
    meta: {
      messages: {
        encryptionDisabled: 'Make sure that using unencrypted {{search}} domains is safe here.',
        encryptionOmitted:
          'Omitting {{encryptionPropertyName}} causes encryption of data at rest to be ' +
          'disabled for this {{search}} domain. Make sure it is safe here.',
      },
    },
  },
);

class Result {
  constructor(readonly node: Node, readonly status: 'missing' | 'unknown' | 'found') {}

  get isFound() {
    return this.status === 'found';
  }

  get isMissing() {
    return this.status === 'missing';
  }

  get isTrue() {
    return (
      this.status === 'found' &&
      this.node.type === 'Literal' &&
      typeof this.node.value === 'boolean' &&
      this.node.value
    );
  }

  map<N extends Node>(_closure: (node: N) => Result): Result {
    return this;
  }

  filter(_type: string): Result {
    return this;
  }

  withNodeIfNotFound(node: Node): Result {
    return !this.isFound ? new Result(node, this.status) : this;
  }
}

class FoundResult extends Result {
  constructor(value: Node) {
    super(value, 'found');
  }

  map<N extends Node>(closure: (node: N) => Result): Result {
    return closure(this.node as N);
  }

  filter(type: string): Result {
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

function domainChecker(options: DomainCheckerOptions) {
  return (expr: NewExpression, ctx: Rule.RuleContext) => {
    const argument = queryArgument(expr, DOMAIN_PROPS_POSITION);
    const encryptionProperty = argument
      .filter('ObjectExpression')
      .map((node: ObjectExpression) => queryProperty(node, options.encryptionProperty));
    const enabledProperty = encryptionProperty
      .filter('ObjectExpression')
      .map((node: ObjectExpression) => queryProperty(node, ENABLED_PROPERTY));
    const bool = enabledProperty.map(node => queryBoolean(node));

    if (bool.isMissing) {
      report({
        messageId: 'encryptionOmitted',
        node: bool.node,
        data: {
          encryptionPropertyName: options.encryptionProperty,
          search: OPEN_SEARCH, // TODO
        },
      });
    } else if (bool.isFound && !bool.isTrue) {
      report({
        messageId: 'encryptionDisabled',
        node: enabledProperty.node,
        data: {
          search: OPEN_SEARCH, // TODO
        },
      });
    }

    function report(descriptor: Rule.ReportDescriptor) {
      ctx.report(descriptor);
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

    function queryProperty(node: ObjectExpression, name: string) {
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
        return hasSpreadElement ? unknown(node) : missing(node);
      } else {
        return new FoundResult(property.value);
      }
    }

    function queryBoolean(node: Node) {
      if (isLiteral(node)) {
        return queryBooleanFromLiteral(node);
      } else if (isIdentifier(node)) {
        return queryBooleanFromIdentifier(node);
      } else {
        return unknown(node);
      }
    }

    function queryBooleanFromLiteral(node: Literal) {
      if (typeof node.value !== 'boolean') {
        return unknown(node);
      }
      return found(node);
    }

    function queryBooleanFromIdentifier(node: Identifier): Result {
      if (isUndefined(node)) {
        return missing(node);
      }

      const usage = getUniqueWriteUsage(ctx, node.name);
      if (!usage) {
        return unknown(node);
      }

      return queryBoolean(usage).withNodeIfNotFound(node);
    }
  };
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
