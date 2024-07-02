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
// https://sonarsource.github.io/rspec/#/rspec/S6270/javascript

import { Rule } from 'eslint';
import { NewExpression, Node } from 'estree';
import {
  getFullyQualifiedName,
  isArrayExpression,
  isStringLiteral,
  StringLiteral,
  toEncodedMessage,
} from '../helpers';
import { getResultOfExpression, Result } from '../helpers/result';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  isAnyLiteral,
  PolicyCheckerOptions,
} from '../helpers/aws/iam';
import { normalizeFQN } from '../helpers/aws/cdk';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';
import { SONAR_RUNTIME } from '../parameters';

const AWS_PRINCIPAL_PROPERTY = 'AWS';

const ARN_PRINCIPAL = 'aws_cdk_lib.aws_iam.ArnPrincipal';

const MESSAGES = {
  message: 'Make sure granting public access is safe here.',
  secondary: 'Related effect',
};

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  publicAccessStatementChecker,
  generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
);

function publicAccessStatementChecker(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);
  const effect = getSensitiveEffect(properties, ctx, options);
  const principal = getSensitivePrincipal(properties, ctx, options);

  if (effect.isMissing && principal) {
    ctx.report({
      message: toEncodedMessage(MESSAGES.message),
      node: principal,
    });
  } else if (effect.isFound && principal) {
    ctx.report({
      message: toEncodedMessage(MESSAGES.message, [effect.node], [MESSAGES.secondary]),
      node: principal,
    });
  }
}

function getSensitivePrincipal(
  properties: Result,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const principal = properties.getProperty(options.principals.property);
  if (!principal.isFound) {
    return null;
  } else if (options.principals.type === 'FullyQualifiedName') {
    return getSensitivePrincipalFromFullyQualifiedName(ctx, principal.node, options);
  } else {
    return getSensitivePrincipalFromJson(ctx, principal.node);
  }
}

function getSensitivePrincipalFromFullyQualifiedName(
  ctx: Rule.RuleContext,
  node: Node,
  options: PolicyCheckerOptions,
) {
  return getPrincipalNewExpressions(node).find(expr =>
    isSensitivePrincipalNewExpression(ctx, expr, options),
  );
}

function getPrincipalNewExpressions(node: Node) {
  const newExpressions: NewExpression[] = [];

  if (isArrayExpression(node)) {
    for (const element of node.elements) {
      if (element?.type === 'NewExpression') {
        newExpressions.push(element);
      }
    }
  }

  return newExpressions;
}

function getSensitivePrincipalFromJson(ctx: Rule.RuleContext, node: Node) {
  return getPrincipalLiterals(node, ctx).find(isAnyLiteral);
}

function isSensitivePrincipalNewExpression(
  ctx: Rule.RuleContext,
  newExpression: NewExpression,
  options: PolicyCheckerOptions,
) {
  return (options.principals.anyValues ?? []).some(anyValue => {
    if (anyValue === ARN_PRINCIPAL) {
      const argument = newExpression.arguments[0];
      return isStringLiteral(argument) && isAnyLiteral(argument);
    } else {
      return anyValue === normalizeFQN(getFullyQualifiedName(ctx, newExpression.callee));
    }
  });
}

function getPrincipalLiterals(node: Node, ctx: Rule.RuleContext) {
  const literals: StringLiteral[] = [];

  if (isStringLiteral(node)) {
    literals.push(node);
  } else {
    const awsLiterals = getResultOfExpression(ctx, node)
      .getProperty(AWS_PRINCIPAL_PROPERTY)
      .asStringLiterals();
    literals.push(...awsLiterals);
  }

  return literals;
}
