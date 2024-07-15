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
// https://sonarsource.github.io/rspec/#/rspec/S6302/javascript

import { Rule } from 'eslint';
import { Node } from 'estree';
import { getResultOfExpression, Result } from '../helpers/result';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  isAnyLiteral,
  PolicyCheckerOptions,
} from '../helpers/aws/iam';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';
import { SONAR_RUNTIME } from '../helpers';
import { report, toSecondaryLocation } from '../helpers';

const MESSAGES = {
  message: 'Make sure granting all privileges is safe here.',
  secondary: 'Related effect',
};

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  allPrivilegesStatementChecker,
  generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
);

function allPrivilegesStatementChecker(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);
  const effect = getSensitiveEffect(properties, ctx, options);
  const action = getSensitiveAction(properties, options);

  if (effect.isMissing && action) {
    report(ctx, {
      message: MESSAGES.message,
      node: action,
    });
  } else if (effect.isFound && action) {
    report(
      ctx,
      {
        message: MESSAGES.message,
        node: action,
      },
      [toSecondaryLocation(effect.node, MESSAGES.secondary)],
    );
  }
}

function getSensitiveAction(properties: Result, options: PolicyCheckerOptions) {
  return getActionLiterals(properties, options).find(isAnyLiteral);
}

function getActionLiterals(properties: Result, options: PolicyCheckerOptions) {
  return properties.getProperty(options.actions.property).asStringLiterals();
}
