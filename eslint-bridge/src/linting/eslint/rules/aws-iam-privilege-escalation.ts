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
import { Literal, Node } from 'estree';
import { flattenArgs, getFullyQualifiedName, isStringLiteral, toEncodedMessage } from './helpers';
import { getResultOfExpression, Result } from './helpers/result';
import { AwsIamPolicyTemplate } from './helpers/aws/iam';

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

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  privilegeEscalationStatementChecker,
  JSON_OPTIONS,
  PROPERTIES_OPTIONS,
);

function privilegeEscalationStatementChecker(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);

  if (!isSensitiveEffect(ctx, properties, options) || hasExceptionProperties(properties, options)) {
    return;
  }

  const resource = getSensitiveResource(ctx, properties, options);
  if (!resource) {
    return;
  }

  const action = getSensitiveAction(ctx, properties, options);
  if (!action) {
    return;
  }

  ctx.report({
    message: toEncodedMessage(MESSAGES.message(action.value), [action], [MESSAGES.secondary]),
    node: resource,
  });
}

function isSensitiveEffect(
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

function getSensitiveAction(
  ctx: Rule.RuleContext,
  properties: Result,
  options: PolicyCheckerOptions,
) {
  const actions = properties.getProperty(options.actions.property);
  return actions.map(action => getStringLiterals(ctx, action))?.find(isSensitiveAction);
}

function getSensitiveResource(
  ctx: Rule.RuleContext,
  properties: Result,
  options: PolicyCheckerOptions,
) {
  const resources = properties.getProperty(options.resources.property);
  return resources.map(resource => getStringLiterals(ctx, resource))?.find(isSensitiveResource);
}

function isSensitiveAction(action: StringLiteral) {
  return SENSITIVE_ACTIONS.includes(action.value);
}

function isSensitiveResource(resource: StringLiteral) {
  return SENSITIVE_RESOURCE.test(resource.value);
}

function getStringLiterals(ctx: Rule.RuleContext, node: Node) {
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
