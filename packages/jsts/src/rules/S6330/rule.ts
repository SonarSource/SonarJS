/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { AwsCdkCheckArguments, AwsCdkTemplate } from '../helpers/aws/cdk';
import { generateMeta } from '../helpers';
import { meta } from './meta';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-sqs.Queue': AwsCdkCheckArguments(
      ['OmittedQueue', 'DisabledQueue'],
      true,
      'encryption',
      { fqns: { invalid: ['aws-cdk-lib.aws-sqs.QueueEncryption.UNENCRYPTED'] } },
    ),
    'aws-cdk-lib.aws-sqs.CfnQueue': AwsCdkCheckArguments('CfnQueue', true, 'kmsMasterKeyId'),
  },
  generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      CfnQueue:
        'Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.',
      OmittedQueue:
        'Omitting "encryption" disables SQS queues encryption. Make sure it is safe here.',
      DisabledQueue:
        'Setting "encryption" to "QueueEncryption.UNENCRYPTED" disables SQS queues encryption.' +
        'Make sure it is safe here.',
    },
  }),
);
