/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { CallExpression, NewExpression, Node } from 'estree';
import { Rule } from 'eslint';
import { AwsCdkTemplate, normalizeFQN } from './cdk';
import { SONAR_RUNTIME } from '../../../linter/parameters';
import { getResultOfExpression, Result } from '../result';
import { flattenArgs, isStringLiteral, StringLiteral } from '../ast';
import { getFullyQualifiedName } from '../module';

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

export function AwsIamPolicyTemplate(statementChecker: StatementChecker) {
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
