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
// https://sonarsource.github.io/rspec/#/rspec/S6304/javascript

import { Rule } from 'eslint';
import { Node } from 'estree';
import { StringLiteral, toEncodedMessage } from '../helpers';
import { getResultOfExpression, Result } from '../helpers/result';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  isAnyLiteral,
  PolicyCheckerOptions,
} from '../helpers/aws/iam';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';
import { SONAR_RUNTIME } from '../../linter/parameters';

const MESSAGES = {
  message: 'Make sure granting access to all resources is safe here.',
  secondary: 'Related effect',
};

const KMS_PREFIX = 'kms:';

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  allResourcesAccessibleStatementCheck,
  generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
);

function allResourcesAccessibleStatementCheck(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);
  const effect = getSensitiveEffect(properties, ctx, options);
  const resource = getSensitiveResource(properties, options);

  if (isException(properties, options)) {
    return;
  }

  if (effect.isMissing && resource) {
    ctx.report({
      message: toEncodedMessage(MESSAGES.message),
      node: resource,
    });
  } else if (effect.isFound && resource) {
    ctx.report({
      message: toEncodedMessage(MESSAGES.message, [effect.node], [MESSAGES.secondary]),
      node: resource,
    });
  }
}

function isException(properties: Result, options: PolicyCheckerOptions) {
  return properties.getProperty(options.actions.property).everyStringLiteral(isKmsAction);
}

function isKmsAction(action: StringLiteral) {
  return action.value.startsWith(KMS_PREFIX);
}

function getSensitiveResource(properties: Result, options: PolicyCheckerOptions) {
  return getSensitiveResources(properties, options).find(isAnyLiteral);
}

function getSensitiveResources(properties: Result, options: PolicyCheckerOptions) {
  return properties.getProperty(options.resources.property).asStringLiterals();
}
