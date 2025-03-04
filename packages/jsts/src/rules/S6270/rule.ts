/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6270/javascript

import type { Rule } from 'eslint';
import { NewExpression, Node } from 'estree';
import {
  generateMeta,
  getFullyQualifiedName,
  isArrayExpression,
  isStringLiteral,
  report,
  StringLiteral,
  toSecondaryLocation,
} from '../helpers/index.js';
import { getResultOfExpression, Result } from '../helpers/result.js';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  isAnyLiteral,
  PolicyCheckerOptions,
} from '../helpers/aws/iam.js';
import { normalizeFQN } from '../helpers/aws/cdk.js';
import * as meta from './meta.js';

const AWS_PRINCIPAL_PROPERTY = 'AWS';

const ARN_PRINCIPAL = 'aws_cdk_lib.aws_iam.ArnPrincipal';

const MESSAGES = {
  message: 'Make sure granting public access is safe here.',
  secondary: 'Related effect',
};

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  publicAccessStatementChecker,
  generateMeta(meta),
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
    report(ctx, {
      message: MESSAGES.message,
      node: principal,
    });
  } else if (effect.isFound && principal) {
    report(
      ctx,
      {
        message: MESSAGES.message,
        node: principal,
      },
      [toSecondaryLocation(effect.node, MESSAGES.secondary)],
    );
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
