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

import { CallExpression, NewExpression, Node } from 'estree';
import { Rule } from 'eslint';
import { AwsCdkTemplate } from './cdk';
import { SONAR_RUNTIME } from '../../../linter/parameters';
import { getResultOfExpression } from '../result';
import { flattenArgs } from '../ast';

type StatementChecker<O> = (expr: Node, ctx: Rule.RuleContext, options: O) => void;

const PROPERTIES_POSITION = 0;
const POLICY_DOCUMENT_STATEMENT_PROPERTY = 'Statement';

export function AwsIamPolicyTemplate<O>(
  statementChecker: StatementChecker<O>,
  jsonOptions: O,
  propsOptions: O,
) {
  return AwsCdkTemplate(
    {
      'aws-cdk-lib.aws-iam.PolicyStatement': {
        newExpression: policyStatementChecker(statementChecker, propsOptions),
        functionName: 'fromJson',
        callExpression: policyStatementChecker(statementChecker, jsonOptions),
      },
      'aws-cdk-lib.aws-iam.PolicyDocument': {
        functionName: 'fromJson',
        callExpression: policyDocumentChecker(statementChecker, jsonOptions),
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

function policyDocumentChecker<O>(statementChecker: StatementChecker<O>, options: O) {
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

function policyStatementChecker<O>(statementChecker: StatementChecker<O>, options: O) {
  return (expr: CallExpression | NewExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);

    if (properties.isFound) {
      statementChecker(properties.node, ctx, options);
    }
  };
}
