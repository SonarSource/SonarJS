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
// https://sonarsource.github.io/rspec/#/rspec/S6327/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getValueOfExpression,
  isUndefined,
  isIdentifier,
  getUniqueWriteUsageOrNode,
  isStringLiteral,
} from './helpers';
import { AwsCdkTemplate } from './helpers/aws/cdk';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws_sns.Topic': checkTopic('masterKey'),
    'aws-cdk-lib.aws_sns.CfnTopic': checkTopic('kmsMasterKeyId'),
  },
  {
    meta: {
      messages: {
        issue: 'Omitting "{{key}}" disables SNS topics encryption. Make sure it is safe here.',
      },
    },
  },
);

function checkTopic(key: string) {
  return (expr: estree.NewExpression, ctx: Rule.RuleContext) => {
    if (expr.arguments.some(arg => arg.type === 'SpreadElement')) {
      return;
    }

    const props = getValueOfExpression(ctx, expr.arguments[2], 'ObjectExpression');
    if (props === undefined) {
      report(expr.callee);
      return;
    }

    const masterKey = getProperty(props, key);
    if (masterKey === null) {
      report(props);
      return;
    }

    const masterKeyValue = getUniqueWriteUsageOrNode(ctx, masterKey.value);
    if (isUndefined(masterKeyValue)) {
      report(masterKey);
      return;
    }

    function report(node: estree.Node) {
      ctx.report({
        messageId: 'issue',
        data: { key },
        node,
      });
    }

    function getProperty(expr: estree.ObjectExpression, key: string): estree.Property | null {
      for (let i = expr.properties.length - 1; i >= 0; --i) {
        const property = expr.properties[i];
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

      function isProperty(node: estree.Node, key: string): node is estree.Property {
        return (
          node.type === 'Property' &&
          (isIdentifier(node.key, key) || (isStringLiteral(node.key) && node.key.value === key))
        );
      }
    }
  };
}
