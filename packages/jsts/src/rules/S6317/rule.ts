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
// https://sonarsource.github.io/rspec/#/rspec/S6317/javascript

import type { Rule } from 'eslint';
import type { Node } from 'estree';
import { generateMeta, report, StringLiteral, toSecondaryLocation } from '../helpers/index.js';
import { getResultOfExpression, Result } from '../helpers/result.js';
import {
  AwsIamPolicyTemplate,
  getSensitiveEffect,
  PolicyCheckerOptions,
} from '../helpers/aws/iam.js';
import * as meta from './generated-meta.js';

const SENSITIVE_RESOURCE = /^(\*|arn:[^:]*:[^:]*:[^:]*:[^:]*:(role|user|group)\/\*)$/;

const SENSITIVE_ACTIONS = new Set([
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
]);

const MESSAGES = {
  message: (attackVectorName: string) =>
    `This policy is vulnerable to the "${attackVectorName}" privilege escalation vector. ` +
    'Remove permissions or restrict the set of resources they apply to.',
  secondary: 'Permissions are granted on all resources.',
};

export const rule: Rule.RuleModule = AwsIamPolicyTemplate(
  privilegeEscalationStatementChecker,
  generateMeta(meta),
);

function privilegeEscalationStatementChecker(
  expr: Node,
  ctx: Rule.RuleContext,
  options: PolicyCheckerOptions,
) {
  const properties = getResultOfExpression(ctx, expr);
  const effect = getSensitiveEffect(properties, ctx, options);
  const resource = getSensitiveResource(properties, options);
  const action = getSensitiveAction(properties, options);

  if (
    !hasExceptionProperties(properties, options) &&
    (effect.isFound || effect.isMissing) &&
    resource &&
    action
  ) {
    report(
      ctx,
      {
        message: MESSAGES.message(action.value),
        node: resource,
      },
      [toSecondaryLocation(action, MESSAGES.secondary)],
    );
  }
}

function getSensitiveAction(properties: Result, options: PolicyCheckerOptions) {
  const actions = properties.getProperty(options.actions.property);
  return actions.asStringLiterals().find(isSensitiveAction);
}

function getSensitiveResource(properties: Result, options: PolicyCheckerOptions) {
  const resources = properties.getProperty(options.resources.property);
  return resources.asStringLiterals().find(isSensitiveResource);
}

function isSensitiveAction(action: StringLiteral) {
  return SENSITIVE_ACTIONS.has(action.value);
}

function isSensitiveResource(resource: StringLiteral) {
  return SENSITIVE_RESOURCE.test(resource.value);
}

function hasExceptionProperties(properties: Result, options: PolicyCheckerOptions) {
  const exceptionProperties = [options.principals.property, options.conditions.property];
  return exceptionProperties.some(prop => !properties.getProperty(prop).isMissing);
}
