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
import { NewExpression } from 'estree';
import { AwsCdkHelper, AwsCdkTemplate, AwsCdkQueryError } from './helpers/aws/cdk';

const VOLUME_PROPS_POSITION = 2;
const ENCRYPTED_PROPERTY = 'encrypted';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-ec2.Volume': AwsCdkHelper.checker(
      (helper: AwsCdkHelper, expr: NewExpression) => {
        try {
          const argument = helper.queryArgument(expr, VOLUME_PROPS_POSITION);
          const property = helper.queryProperty(argument, ENCRYPTED_PROPERTY);
          const bool = helper.queryBoolean(property.value);

          if (!bool) {
            helper.report({
              messageId: 'encryptionDisabled',
              node: property.value,
            });
          }
        } catch (e) {
          if (e instanceof AwsCdkQueryError && e.type === 'missing') {
            helper.report({
              messageId: 'encryptionOmitted',
              node: e.node,
            });
          }
        }
      },
    ),
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
