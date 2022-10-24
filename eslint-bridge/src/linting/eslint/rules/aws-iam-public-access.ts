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
// https://sonarsource.github.io/rspec/#/rspec/S6317/javascript

import { Rule } from 'eslint';
import { AwsCdkTemplate } from './helpers/aws/cdk';
import { CallExpression, NewExpression, Node } from 'estree';
import {
  flattenArgs,
  getFullyQualifiedName,
  isArrayExpression,
  isStringLiteral,
  toEncodedMessage,
} from './helpers';
import { getResultOfExpression, Result } from './helpers/result';
import { SONAR_RUNTIME } from '../linter/parameters';

interface CheckerOptions {
  effect: {
    property: string;
    type: 'FullyQualifiedName' | 'string';
    allowValue: string;
  };
  principals: {
    property: string;
    type: 'FullyQualifiedName' | 'json';
    anyValues: string[];
  };
}

type StatementChecker = (expr: Node, ctx: Rule.RuleContext, options: CheckerOptions) => void;

const PROPERTIES_POSITION = 0;
const AWS_PRINCIPAL_PROPERTY = 'AWS';
const POLICY_DOCUMENT_STATEMENT_PROPERTY = 'Statement';
const ARN_PRINCIPAL = 'aws_cdk_lib.aws_iam.ArnPrincipal';

const MESSAGES = {
  message: 'Make sure granting public access is safe here.',
  secondary: 'Related effect.',
};

const PROPERTIES_OPTIONS: CheckerOptions = {
  effect: {
    property: 'effect',
    type: 'FullyQualifiedName',
    allowValue: 'aws_cdk_lib.aws_iam.Effect.ALLOW',
  },
  principals: {
    property: 'principals',
    type: 'FullyQualifiedName',
    anyValues: [
      'aws_cdk_lib.aws_iam.StarPrincipal',
      'aws_cdk_lib.aws_iam.AnyPrincipal',
      ARN_PRINCIPAL,
    ],
  },
};

const JSON_OPTIONS: CheckerOptions = {
  effect: {
    property: 'Effect',
    type: 'string',
    allowValue: 'Allow',
  },
  principals: {
    property: 'Principal',
    type: 'json',
    anyValues: [],
  },
};

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(publicAccessStatementChecker);

function AwsIamPolicyTemplate(statementChecker: StatementChecker) {
  return AwsCdkTemplate(
    {
      'aws-cdk-lib.aws-iam.PolicyStatement': {
        newExpression: policyStatementChecker(statementChecker),
        functionName: 'fromJson',
        callExpression: policyStatementChecker(statementChecker),
      },
      'aws-cdk-lib.aws-iam.PolicyDocument': {
        functionName: 'fromJson',
        callExpression: policyDocumentChecker(statementChecker),
      },
    },
    {
      meta: {
        schema: [
          {
            // internal parameter for rules having secondary locations
            enum: [SONAR_RUNTIME],
          },
        ],
      },
    },
  );
}

function policyDocumentChecker(statementChecker: StatementChecker) {
  return (expr: CallExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);
    const statements = properties.getProperty(POLICY_DOCUMENT_STATEMENT_PROPERTY);

    if (statements.isFound) {
      for (const node of flattenArgs(ctx, [statements.node])) {
        statementChecker(node, ctx, JSON_OPTIONS);
      }
    }
  };
}

function policyStatementChecker(statementChecker: StatementChecker) {
  return (expr: CallExpression | NewExpression, ctx: Rule.RuleContext) => {
    const isJson = expr.type === 'CallExpression';
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);

    if (properties.isFound) {
      statementChecker(properties.node, ctx, isJson ? JSON_OPTIONS : PROPERTIES_OPTIONS);
    }
  };
}

function publicAccessStatementChecker(expr: Node, ctx: Rule.RuleContext, options: CheckerOptions) {
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

function getSensitiveEffect(properties: Result, ctx: Rule.RuleContext, options: CheckerOptions) {
  const effect = properties.getProperty(options.effect.property);
  return effect.filter(node => {
    if (options.effect.type === 'FullyQualifiedName') {
      const fullyQualifiedName = getFullyQualifiedName(ctx, node)?.replace(/-/g, '_');
      return fullyQualifiedName === options.effect.allowValue;
    } else {
      return isStringLiteral(node) && node.value === options.effect.allowValue;
    }
  });
}

function getSensitivePrincipal(properties: Result, ctx: Rule.RuleContext, options: CheckerOptions) {
  const principal = properties.getProperty(options.principals.property);
  if (!principal.isFound) {
    return null;
  } else if (options.principals.type === 'FullyQualifiedName') {
    return getSensitivePrincipalFullyQualifiedName(ctx, principal.node, options);
  } else if (options.principals.type === 'json') {
    return getSensitivePrincipalJson(ctx, principal.node);
  }
}

function getSensitivePrincipalFullyQualifiedName(
  ctx: Rule.RuleContext,
  node: Node,
  options: CheckerOptions,
) {
  const elements = isArrayExpression(node) ? node.elements : [];
  return elements.find(
    el => el?.type === 'NewExpression' && isSensitivePrincipalCreation(ctx, el, options),
  );
}

function isSensitivePrincipalCreation(
  ctx: Rule.RuleContext,
  newExpression: NewExpression,
  options: CheckerOptions,
) {
  return options.principals.anyValues.some(anyValue => {
    if (anyValue === ARN_PRINCIPAL) {
      return isSensitivePrincipalLiteral(newExpression.arguments[0]);
    } else {
      return anyValue === getFullyQualifiedName(ctx, newExpression.callee)?.replace(/-/g, '_');
    }
  });
}

function getSensitivePrincipalJson(ctx: Rule.RuleContext, node: Node) {
  if (isStringLiteral(node)) {
    return isSensitivePrincipalLiteral(node) ? node : null;
  }

  const map = getResultOfExpression(ctx, node).getProperty(AWS_PRINCIPAL_PROPERTY);
  if (!map.isFound) {
    return null;
  } else if (isStringLiteral(map.node)) {
    return isSensitivePrincipalLiteral(map.node) ? map.node : null;
  } else if (isArrayExpression(map.node)) {
    return map.node.elements.find(isSensitivePrincipalLiteral);
  } else {
    return null;
  }
}

function isSensitivePrincipalLiteral(element: Node | null | undefined) {
  return element != null && isStringLiteral(element) && element.value === '*';
}
