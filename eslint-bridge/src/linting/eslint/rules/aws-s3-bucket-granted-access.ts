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
// https://sonarsource.github.io/rspec/#/rspec/S6265/javascript

import { Rule } from 'eslint';
import estree from 'estree';
import { SONAR_RUNTIME } from 'linting/eslint/linter/parameters';
import { mergeRules } from './decorators/helpers';
import {
  getFullyQualifiedName,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isIdentifier,
  isMethodCall,
  toEncodedMessage,
} from './helpers';
import { normalizeFQN } from './helpers/aws/cdk';
import {
  S3BucketTemplate,
  isS3BucketDeploymentConstructor,
  findPropagatedSetting,
  isS3BucketConstructor,
  getProperty,
} from './helpers/aws/s3';

const messages = {
  accessLevel: (param: string) => `Make sure granting ${param} access is safe here.`,
  unrestricted: 'Make sure allowing unrestricted access to objects from this bucket is safe here.',
};

const ACCESS_CONTROL_KEY = 'accessControl';
const INVALID_ACCESS_CONTROL_VALUES = ['PUBLIC_READ', 'PUBLIC_READ_WRITE', 'AUTHENTICATED_READ'];

const PUBLIC_READ_ACCESS_KEY = 'publicReadAccess';
const INVALID_PUBLIC_READ_ACCESS_VALUE = true;

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return mergeRules(
      s3BucketConstructorRule.create(context),
      s3BucketDeploymentConstructorRule.create(context),
      handleGrantPublicAccess.create(context),
    );
  },
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
};

const s3BucketConstructorRule: Rule.RuleModule = S3BucketTemplate((bucketConstructor, context) => {
  for (const value of INVALID_ACCESS_CONTROL_VALUES) {
    checkConstantParam(context, bucketConstructor, ACCESS_CONTROL_KEY, [
      'BucketAccessControl',
      value,
    ]);
  }
  checkBooleanParam(
    context,
    bucketConstructor,
    PUBLIC_READ_ACCESS_KEY,
    INVALID_PUBLIC_READ_ACCESS_VALUE,
  );
});

const s3BucketDeploymentConstructorRule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.NewExpression) => {
        if (isS3BucketDeploymentConstructor(context, node)) {
          for (const value of INVALID_ACCESS_CONTROL_VALUES) {
            checkConstantParam(context, node, ACCESS_CONTROL_KEY, ['BucketAccessControl', value]);
          }
        }
      },
    };
  },
};

function checkBooleanParam(
  context: Rule.RuleContext,
  bucketConstructor: estree.NewExpression,
  propName: string,
  propValue: boolean,
) {
  const property = getProperty(context, bucketConstructor, propName);
  if (property == null) {
    return;
  }
  const propertyLiteralValue = getValueOfExpression(context, property.value, 'Literal');
  if (propertyLiteralValue?.value === propValue) {
    const secondary = findPropagatedSetting(property, propertyLiteralValue);
    context.report({
      message: toEncodedMessage(messages.unrestricted, secondary.locations, secondary.messages),
      node: property,
    });
  }
}

function checkConstantParam(
  context: Rule.RuleContext,
  bucketConstructor: estree.NewExpression,
  propName: string,
  paramQualifiers: string[],
) {
  const property = getProperty(context, bucketConstructor, propName);
  if (property == null) {
    return;
  }
  const propertyLiteralValue = getValueOfExpression(context, property.value, 'MemberExpression');
  if (
    propertyLiteralValue !== undefined &&
    normalizeFQN(getFullyQualifiedName(context, propertyLiteralValue)) ===
      `aws_cdk_lib.aws_s3.${paramQualifiers.join('.')}`
  ) {
    const secondary = findPropagatedSetting(property, propertyLiteralValue);
    context.report({
      message: toEncodedMessage(
        messages.accessLevel(paramQualifiers[paramQualifiers.length - 1]),
        secondary.locations,
        secondary.messages,
      ),
      node: property,
    });
  }
}

const handleGrantPublicAccess: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (!isMethodCall(node)) {
          return;
        }
        const { object, property } = node.callee;
        const isGrantPublicAccessMethodCall = isIdentifier(property, 'grantPublicAccess');
        if (!isGrantPublicAccessMethodCall) {
          return;
        }
        const variableAssignment = getUniqueWriteUsageOrNode(context, object);
        const isS3bucketInstance =
          variableAssignment.type === 'NewExpression' &&
          isS3BucketConstructor(context, variableAssignment);
        if (!isS3bucketInstance) {
          return;
        }
        context.report({
          message: toEncodedMessage(messages.unrestricted),
          node: property,
        });
      },
    };
  },
};
