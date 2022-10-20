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
import { NewExpression, Node } from 'estree';
import { getFullyQualifiedName, isUndefined } from './helpers';
import { getResultOfExpression } from './helpers/result';

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
    const result = getResultOfExpression(ctx, expr);
    const argument = result.getArgument(QUEUE_PROPS_POSITION);
    const encryptionProperty = argument.getProperty(options.encryptionProperty);

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
      if (options.hasUnencryptedValue) {
        const fqn = getFullyQualifiedName(ctx, node)?.replace(/-/g, '_');
        return fqn === 'aws_cdk_lib.aws_sqs.QueueEncryption.UNENCRYPTED';
      } else {
        return !options.hasUnencryptedValue && isUndefined(node);
      }
    }
  };
}
