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
import {
  findPropagatedSetting,
  getProperty,
  getValueOfExpression,
  hasFullyQualifiedName,
  S3BucketTemplate,
  toEncodedMessage,
} from '../utils';
import { NewExpression } from 'estree';

const messages = {
  accessLevel: (param: string) => `Make sure granting ${param} access is safe here.`,
  unrestricted: 'Make sure allowing unrestricted access to objects from this bucket is safe here.',
  secondary: 'Propagated setting.',
};

const INVALID_ACCESS_CONTROL_VALUES = ['PUBLIC_READ', 'PUBLIC_READ_WRITE', 'AUTHENTICATED_READ'];
const ACCESS_CONTROL_KEY = 'accessControl';

const PUBLIC_READ_ACCESS_KEY = 'publicReadAccess';
const INVALID_PUBLIC_READ_ACCESS_VALUE = true;

export const rule: Rule.RuleModule = S3BucketTemplate(
  (bucketConstructor, context) => {
    checkBooleanParam(
      context,
      bucketConstructor,
      PUBLIC_READ_ACCESS_KEY,
      INVALID_PUBLIC_READ_ACCESS_VALUE,
    );
    for (const value of INVALID_ACCESS_CONTROL_VALUES) {
      checkConstantParam(context, bucketConstructor, ACCESS_CONTROL_KEY, [
        'BucketAccessControl',
        value,
      ]);
    }
  },
  {
    meta: {
      schema: [
        {
          // internal parameter for rules having secondary locations
          enum: ['sonar-runtime'],
        },
      ],
    },
  },
);

function checkBooleanParam(
  context: Rule.RuleContext,
  bucketConstructor: NewExpression,
  propName: string,
  propValue: boolean,
) {
  const property = getProperty(context, bucketConstructor, propName);
  if (property == null) {
    return;
  }
  const propertyLiteralValue = getValueOfExpression(context, property.value, 'Literal');
  if (propertyLiteralValue !== undefined && propertyLiteralValue.value === propValue) {
    const secondary = findPropagatedSetting(property, propertyLiteralValue);
    context.report({
      message: toEncodedMessage(messages.unrestricted, secondary.locations, secondary.messages),
      node: property,
    });
  }
}

function checkConstantParam(
  context: Rule.RuleContext,
  bucketConstructor: NewExpression,
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
    hasFullyQualifiedName(context, propertyLiteralValue, 'aws-cdk-lib/aws-s3', ...paramQualifiers)
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
