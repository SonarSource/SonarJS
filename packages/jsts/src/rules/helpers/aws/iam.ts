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
import { CallExpression, NewExpression, Node } from 'estree';
import type { Rule } from 'eslint';
import { AwsCdkTemplate, normalizeFQN } from './cdk.js';
import { getResultOfExpression, Result } from '../result.js';
import { flattenArgs, isStringLiteral, StringLiteral } from '../ast.js';
import { getFullyQualifiedName } from '../module.js';
import { RulesMeta } from '@eslint/core';

export interface PolicyCheckerOptions {
  effect: {
    property: string;
    type: 'FullyQualifiedName' | 'string';
    allowValue: string;
  };
  actions: {
    property: string;
    anyValues?: string[];
  };
  resources: {
    property: string;
  };
  conditions: {
    property: string;
  };
  principals: {
    property: string;
    type: 'FullyQualifiedName' | 'json';
    anyValues?: string[];
  };
}

type StatementChecker = (expr: Node, ctx: Rule.RuleContext, options: PolicyCheckerOptions) => void;

const PROPERTIES_POSITION = 0;

const POLICY_DOCUMENT_STATEMENT_PROPERTY = 'Statement';

const ARN_PRINCIPAL = 'aws_cdk_lib.aws_iam.ArnPrincipal';
const STAR_PRINCIPAL = 'aws_cdk_lib.aws_iam.StarPrincipal';
const ANY_PRINCIPAL = 'aws_cdk_lib.aws_iam.AnyPrincipal';

const ANY_LITERAL = '*';

const PROPERTIES_OPTIONS: PolicyCheckerOptions = {
  effect: {
    property: 'effect',
    type: 'FullyQualifiedName',
    allowValue: 'aws_cdk_lib.aws_iam.Effect.ALLOW',
  },
  actions: {
    property: 'actions',
  },
  resources: {
    property: 'resources',
  },
  conditions: {
    property: 'conditions',
  },
  principals: {
    property: 'principals',
    type: 'FullyQualifiedName',
    anyValues: [STAR_PRINCIPAL, ANY_PRINCIPAL, ARN_PRINCIPAL],
  },
};

const JSON_OPTIONS: PolicyCheckerOptions = {
  effect: {
    property: 'Effect',
    type: 'string',
    allowValue: 'Allow',
  },
  actions: {
    property: 'Action',
  },
  resources: {
    property: 'Resource',
  },
  conditions: {
    property: 'Condition',
  },
  principals: {
    property: 'Principal',
    type: 'json',
  },
};

export function AwsIamPolicyTemplate(statementChecker: StatementChecker, meta: RulesMeta) {
  return AwsCdkTemplate(
    {
      'aws-cdk-lib.aws-iam.PolicyStatement': {
        newExpression: policyStatementChecker(statementChecker, PROPERTIES_OPTIONS),
        functionName: 'fromJson',
        callExpression: policyStatementChecker(statementChecker, JSON_OPTIONS),
      },
      'aws-cdk-lib.aws-iam.PolicyDocument': {
        functionName: 'fromJson',
        callExpression: policyDocumentChecker(statementChecker, JSON_OPTIONS),
      },
    },
    meta,
  );
}

export function getSensitiveEffect(
  properties: Result,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const effect = properties.getProperty(options.effect.property);
  return effect.filter(node => {
    if (options.effect.type === 'FullyQualifiedName') {
      const fullyQualifiedName = normalizeFQN(getFullyQualifiedName(ctx, node));
      return fullyQualifiedName === options.effect.allowValue;
    } else {
      return isStringLiteral(node) && node.value === options.effect.allowValue;
    }
  });
}

export function isAnyLiteral(literal: StringLiteral) {
  return literal.value === ANY_LITERAL;
}

function policyDocumentChecker(statementChecker: StatementChecker, options: PolicyCheckerOptions) {
  return (expr: CallExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);
    const statements = properties.getProperty(POLICY_DOCUMENT_STATEMENT_PROPERTY);

    if (statements.isFound) {
      for (const node of flattenArgs(ctx, [statements.node])) {
        statementChecker(node, ctx, options);
      }
    }
  };
}

function policyStatementChecker(statementChecker: StatementChecker, options: PolicyCheckerOptions) {
  return (expr: CallExpression | NewExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);

    if (properties.isFound) {
      statementChecker(properties.node, ctx, options);
    }
  };
}
