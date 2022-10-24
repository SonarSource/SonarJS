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
import { CallExpression, Literal, NewExpression, Node } from 'estree';
import { flattenArgs, getFullyQualifiedName, isStringLiteral, toEncodedMessage } from './helpers';
import { getResultOfExpression, Result } from './helpers/result';
import { SONAR_RUNTIME } from '../linter/parameters';

interface PolicyCheckerOptions {
  effect: {
    property: string;
    type: 'FullyQualifiedName' | 'string';
    allowValue: string;
  };
  actions: {
    property: string;
  };
  resources: {
    property: string;
  };
  exceptionProperties: string[];
}

type StringLiteral = Literal & { value: string };

const PROPERTIES_POSITION = 0;

const SENSITIVE_RESOURCE = /^(\*|arn:[^:]*:[^:]*:[^:]*:[^:]*:(role|user|group)\/\*)$/;

const SENSITIVE_ACTIONS = [
  'cloudformation:CreateStack',
  'datapipeline:CreatePipeline',
  'datapipeline:PutPipelineDefinition',
  'ec2:RunInstances',
  'glue:CreateDevEndpoint',
  'glue:UpdateDevEndpoint',
  'iam:AddUserToGroup',
  'iam:AttachGroupPolicy',
  'iam:AttachRolePolicy',
  'iam:AttachUserPolicy',
  'iam:CreateAccessKey',
  'iam:CreateLoginProfile',
  'iam:CreatePolicyVersion',
  'iam:PassRole',
  'iam:PutGroupPolicy',
  'iam:PutRolePolicy',
  'iam:PutUserPolicy',
  'iam:SetDefaultPolicyVersion',
  'iam:UpdateAssumeRolePolicy',
  'iam:UpdateLoginProfile',
  'lambda:AddPermission',
  'lambda:CreateEventSourceMapping',
  'lambda:CreateFunction',
  'lambda:InvokeFunction',
  'lambda:UpdateFunctionCode',
  'sts:AssumeRole',
];

const MESSAGES = {
  message: (attackVectorName: string) =>
    `This policy is vulnerable to the "${attackVectorName}" privilege escalation vector. ` +
    'Remove permissions or restrict the set of resources they apply to.',
  secondary: 'Permissions are granted on all resources.',
};

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
  exceptionProperties: ['principals', 'conditions'],
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
  exceptionProperties: ['Principal', 'Condition'],
};

const POLICY_DOCUMENT_STATEMENT_PROPERTY = 'Statement';

export const rule: Rule.RuleModule = AwsCdkTemplate(
  {
    'aws-cdk-lib.aws-iam.PolicyStatement': {
      newExpression: policyStatementChecker(statementChecker(PROPERTIES_OPTIONS)),
      functionName: 'fromJson',
      callExpression: policyStatementChecker(statementChecker(JSON_OPTIONS)),
    },
    'aws-cdk-lib.aws-iam.PolicyDocument': {
      functionName: 'fromJson',
      callExpression: policyDocumentChecker(statementChecker(JSON_OPTIONS)),
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

function policyDocumentChecker(statementChecker: (ctx: Rule.RuleContext, node: Node) => void) {
  return (expr: CallExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);
    const statements = properties.getProperty(POLICY_DOCUMENT_STATEMENT_PROPERTY);

    if (statements.isFound) {
      for (const node of flattenArgs(ctx, [statements.node])) {
        statementChecker(ctx, node);
      }
    }
  };
}

function policyStatementChecker(statementChecker: (ctx: Rule.RuleContext, node: Node) => void) {
  return (expr: CallExpression | NewExpression, ctx: Rule.RuleContext) => {
    const call = getResultOfExpression(ctx, expr);
    const properties = call.getArgument(PROPERTIES_POSITION);

    if (properties.isFound) {
      statementChecker(ctx, properties.node);
    }
  };
}

function statementChecker(options: PolicyCheckerOptions) {
  return (ctx: Rule.RuleContext, node: Node) => {
    const properties = getResultOfExpression(ctx, node);

    if (!isEffectAllow(ctx, properties, options) || hasExceptionProperties(properties, options)) {
      return;
    }

    const resource = findFirstSensitiveResource(properties, options);
    if (!resource) {
      return;
    }

    const action = findFirstSensitiveAction(properties, options);
    if (!action) {
      return;
    }

    ctx.report({
      message: toEncodedMessage(MESSAGES.message(action.value), [action], [MESSAGES.secondary]),
      node: resource,
    });

    function isEffectAllow(
      ctx: Rule.RuleContext,
      properties: Result,
      options: PolicyCheckerOptions,
    ) {
      const effect = properties.getProperty(options.effect.property);
      if (!effect.isFound) {
        return effect.isMissing;
      } else if (options.effect.type === 'FullyQualifiedName') {
        const fullyQualifiedName = getFullyQualifiedName(ctx, effect.node)?.replace(/-/g, '_');
        return fullyQualifiedName === options.effect.allowValue;
      } else {
        return isStringLiteral(effect.node) && effect.node.value === options.effect.allowValue;
      }
    }

    function findFirstSensitiveAction(properties: Result, options: PolicyCheckerOptions) {
      const actions = properties.getProperty(options.actions.property);
      return actions.map(getStringLiterals)?.find(isSensitiveAction);
    }

    function findFirstSensitiveResource(properties: Result, options: PolicyCheckerOptions) {
      const resources = properties.getProperty(options.resources.property);
      return resources.map(getStringLiterals)?.find(isSensitiveResource);
    }

    function isSensitiveAction(action: StringLiteral) {
      return SENSITIVE_ACTIONS.includes(action.value);
    }

    function isSensitiveResource(resource: StringLiteral) {
      return SENSITIVE_RESOURCE.test(resource.value);
    }

    function getStringLiterals(node: Node) {
      const values: StringLiteral[] = [];

      for (const arg of flattenArgs(ctx, [node])) {
        if (isStringLiteral(arg)) {
          values.push(arg);
        }
      }

      return values;
    }

    function hasExceptionProperties(properties: Result, options: PolicyCheckerOptions) {
      return options.exceptionProperties.some(prop => !properties.getProperty(prop).isMissing);
    }
  };
}
