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
import { AwsCdkTemplate } from './helpers';
import { NewExpression, Node, ObjectExpression, Property } from 'estree';

type QueryResult<T> =
  | { node: Node; type: 'missing' | 'unknown' }
  | { node: Node; type: 'found'; result: T };

const messages = {
  encryptionDisabled: 'Make sure that using unencrypted volumes is safe here.',
  encryptionOmitted: 'Omitting "encrypted" disables volumes encryption. Make sure it is safe here.',
};

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-ec2.Volume': checkVolumeProperties,
  },
  {
    meta: {
      messages,
    },
  },
);

function checkVolumeProperties(expr: NewExpression, ctx: Rule.RuleContext) {
  function report(messageId: keyof typeof messages, node: Node) {
    ctx.report({ messageId, node });
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

  const argument = reportOrGetValue(queryArgument(expr, 2));
  if (argument == null) {
    return;
  }

  const property = reportOrGetValue(queryProperty(argument, 'encrypted'));
  if (property == null) {
    return;
  }

  const bool = reportOrGetValue(queryBoolean(property));
  if (bool == null) {
    return;
  }

  if (!bool) {
    report('encryptionDisabled', property);
  }
}

function queryArgument(node: NewExpression, position: number): QueryResult<ObjectExpression> {
  const args = node.arguments;
  if (position >= args.length) {
    return { node, type: 'missing' };
  }

  let index = 0;
  while (index <= position && args[index].type !== 'SpreadElement') {
    index++;
  }

  const arg = args[index - 1];
  return arg.type !== 'ObjectExpression'
    ? { node, type: 'unknown' }
    : { node, type: 'found', result: arg };
}

function queryProperty(node: ObjectExpression, name: string): QueryResult<Property> {
  function isPropertyNamed(property: Property, name: string) {
    if (property.key.type === 'Literal') {
      return property.key.value === name;
    } else if (property.key.type === 'Identifier') {
      return property.key.name === name;
    } else {
      return false;
    }
  }

  let property: Property | null = null;
  let hasSpreadElement = false;
  let index = 0;

  while (index < node.properties.length && property == null) {
    const element = node.properties[index];
    if (element.type === 'Property' && isPropertyNamed(element, name)) {
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

function queryBoolean(node: Property): QueryResult<boolean> {
  if (node.value.type === 'Literal') {
    const literal = node.value.value;
    if (literal == null) {
      return { node, type: 'missing' };
    } else if (typeof literal === 'boolean') {
      return { node, type: 'found', result: literal };
    } else {
      return { node, type: 'unknown' };
    }
  } else {
    return { node, type: 'unknown' };
  }
}
