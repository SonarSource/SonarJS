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
// https://sonarsource.github.io/rspec/#/rspec/S6319/javascript

import { Rule } from 'eslint';
import {
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isIdentifier,
  isStringLiteral,
  isUndefined
} from './helpers';

import * as estree from 'estree';
import {AwsCdkTemplate} from "./helpers/aws/cdk";

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_sagemaker.CfnNotebookInstance': checkNotebookEncryption,
  },
  {
    meta: {
      messages: {
        issue: 'Omitting `kms_key_id` disables encryption of SageMaker notebook instances. Make sure it is safe here.',
      },
    },
  },
);

const OPTIONS_ARGUMENT_POSITION = 2;

function checkNotebookEncryption(expr: estree.NewExpression, ctx: Rule.RuleContext) {

  for (const argument of expr.arguments) {
    if (argument.type === 'SpreadElement') {
      return;
    }
  }

  const props = getValueOfExpression(ctx, expr.arguments[OPTIONS_ARGUMENT_POSITION], 'ObjectExpression');
  if (props === undefined) {
    report(expr.callee);
    return;
  }

  const propertyKey = getProperty(props, 'kmsKeyId');
  if (propertyKey === null) {
    report(props);
    return;
  }

  const propertyValue = getUniqueWriteUsageOrNode(ctx, propertyKey.value);
  if (isUndefined(propertyValue)) {
    report(propertyKey.value);
    return;
  }

  function report(node: estree.Node) {
    ctx.report({
      messageId: 'issue',
      node,
    });
  }

  function getProperty(expr: estree.ObjectExpression, key: string): estree.Property | null {
    for (const property of expr.properties.reverse()) {
      if (isProperty(property, key)) {
        return property;
      }
      if (property.type === 'SpreadElement') {
        const props = getValueOfExpression(ctx, property.argument, 'ObjectExpression');
        if (props !== undefined) {
          const prop = getProperty(props, key);
          if (prop !== null) {
            return prop;
          }
        }
      }
    }
    return null;
  }

  function isProperty(node: estree.Node, key: string): node is estree.Property {
    return (
      node.type === 'Property' &&
      (isIdentifier(node.key, key) || (isStringLiteral(node.key) && node.key.value === key))
    );
  }
}

