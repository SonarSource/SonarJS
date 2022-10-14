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
import { AwsCdkHelper, AwsCdkQueryError, AwsCdkTemplate } from './helpers/aws/cdk';
import { NewExpression } from 'estree';

const DOMAIN_PROPS_POSITION = 2;
const ENABLED_PROPERTY = 'enabled';
const OPEN_SEARCH = 'OpenSearch';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-opensearchservice.Domain': domainChecker('encryptionAtRest', OPEN_SEARCH),
    'aws-cdk-lib.aws-opensearchservice.CfnDomain': domainChecker(
      'encryptionAtRestOptions',
      OPEN_SEARCH,
    ),
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

function domainChecker(encryptionPropertyName: string, search: string) {
  return AwsCdkHelper.checker(function (helper: AwsCdkHelper, expr: NewExpression) {
    try {
      const argument = helper.queryArgument(expr, DOMAIN_PROPS_POSITION);
      const encryptionProperty = helper.queryProperty(argument, encryptionPropertyName);
      if (encryptionProperty.value.type !== 'ObjectExpression') {
        return;
      }

      const enabledProperty = helper.queryProperty(encryptionProperty.value, ENABLED_PROPERTY);
      const bool = helper.queryBoolean(enabledProperty.value);

      if (!bool) {
        helper.report({
          messageId: 'encryptionDisabled',
          node: enabledProperty.value,
          data: {
            search,
          },
        });
      }
    } catch (e) {
      if (e instanceof AwsCdkQueryError && e.type === 'missing') {
        helper.report({
          messageId: 'encryptionOmitted',
          node: e.node,
          data: {
            encryptionPropertyName,
            search,
          },
        });
      }
    }
  });
}
