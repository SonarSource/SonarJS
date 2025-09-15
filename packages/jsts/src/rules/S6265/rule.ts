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
// https://sonarsource.github.io/rspec/#/rspec/S6265/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  findPropagatedSetting,
  generateMeta,
  getBucketProperty,
  getFullyQualifiedName,
  getUniqueWriteUsageOrNode,
  getValueOfExpression,
  isIdentifier,
  isMethodCall,
  isS3BucketConstructor,
  isS3BucketDeploymentConstructor,
  mergeRules,
  normalizeFQN,
  report,
  S3BucketTemplate,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const messages = {
  accessLevel: (param: string) => `Make sure granting ${param} access is safe here.`,
  unrestricted: 'Make sure allowing unrestricted access to objects from this bucket is safe here.',
};

const ACCESS_CONTROL_KEY = 'accessControl';
const INVALID_ACCESS_CONTROL_VALUES = ['PUBLIC_READ', 'PUBLIC_READ_WRITE', 'AUTHENTICATED_READ'];

const PUBLIC_READ_ACCESS_KEY = 'publicReadAccess';
const INVALID_PUBLIC_READ_ACCESS_VALUE = true;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    return mergeRules(
      s3BucketConstructorRule.create(context),
      s3BucketDeploymentConstructorRule.create(context),
      handleGrantPublicAccess.create(context),
    );
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
  const property = getBucketProperty(context, bucketConstructor, propName);
  if (property == null) {
    return;
  }
  const propertyLiteralValue = getValueOfExpression(context, property.value, 'Literal');
  if (propertyLiteralValue?.value === propValue) {
    const secondary = findPropagatedSetting(property, propertyLiteralValue);
    report(
      context,
      {
        message: messages.unrestricted,
        node: property,
      },
      secondary ? [secondary] : [],
    );
  }
}

function checkConstantParam(
  context: Rule.RuleContext,
  bucketConstructor: estree.NewExpression,
  propName: string,
  paramQualifiers: string[],
) {
  const property = getBucketProperty(context, bucketConstructor, propName);
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
    report(
      context,
      {
        message: messages.accessLevel(paramQualifiers.at(-1)!),
        node: property,
      },
      secondary ? [secondary] : [],
    );
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
        report(context, {
          message: messages.unrestricted,
          node: property,
        });
      },
    };
  },
};
