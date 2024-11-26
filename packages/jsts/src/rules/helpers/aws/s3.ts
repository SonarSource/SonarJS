/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import type { Rule } from 'eslint';
import estree from 'estree';
import {
  getFullyQualifiedName,
  getNodeParent,
  getValueOfExpression,
  isIdentifier,
  isProperty,
  IssueLocation,
  toSecondaryLocation,
} from '../index.js';
import { normalizeFQN } from './cdk.js';

/**
 * A rule template for AWS S3 Buckets
 *
 * The rule template allows to detect sensitive configuration passed on
 * the invocation of S3 Bucket's constructor from AWS CDK:
 *
 * ```new s3.Bucket(...)```
 *
 * @param callback the callback invoked on visiting S3 Bucket's instantiation
 * @param meta the instantiated rule metadata
 * @returns the instantiated rule definition
 */
export function S3BucketTemplate(
  callback: (bucketConstructor: estree.NewExpression, context: Rule.RuleContext) => void,
  meta: Rule.RuleMetaData = {},
): Rule.RuleModule {
  return {
    meta,
    create(context: Rule.RuleContext) {
      return {
        NewExpression: (node: estree.NewExpression) => {
          if (isS3BucketConstructor(context, node)) {
            callback(node, context);
          }
        },
      };
    },
  };
}

/**
 * Detects S3 Bucket's constructor invocation from 'aws-cdk-lib/aws-s3':
 *
 * const s3 = require('aws-cdk-lib/aws-s3');
 * new s3.Bucket();
 */
export function isS3BucketConstructor(context: Rule.RuleContext, node: estree.NewExpression) {
  return normalizeFQN(getFullyQualifiedName(context, node)) === 'aws_cdk_lib.aws_s3.Bucket';
}

/**
 * Detects S3 BucketDeployment's constructor invocation from 'aws-cdk-lib/aws-s3-deployment':
 *
 * const s3 = require('aws-cdk-lib/aws-s3-deployment');
 * new s3.BucketDeployment();
 */
export function isS3BucketDeploymentConstructor(
  context: Rule.RuleContext,
  node: estree.NewExpression,
) {
  return (
    normalizeFQN(getFullyQualifiedName(context, node)) ===
    'aws_cdk_lib.aws_s3_deployment.BucketDeployment'
  );
}

/**
 * Extracts a property from the configuration argument of S3 Bucket's constructor
 *
 * ```
 * new s3.Bucket(_, _, { // config
 *  key1: value1,
 *  ...
 *  keyN: valueN
 * });
 * ```
 *
 * @param context the rule context
 * @param bucket the invocation of S3 Bucket's constructor
 * @param key the key of the property to extract
 * @returns the extracted property
 */
export function getBucketProperty(
  context: Rule.RuleContext,
  bucket: estree.NewExpression,
  key: string,
) {
  const args = bucket.arguments as estree.Expression[];

  const optionsArg = args[2];
  const options = getValueOfExpression(context, optionsArg, 'ObjectExpression');
  if (options == null) {
    return null;
  }

  return options.properties.find(
    property => isProperty(property) && isIdentifier(property.key, key),
  ) as estree.Property | undefined;
}

/**
 * Finds the propagated setting of a sensitive property
 */
export function findPropagatedSetting(
  sensitiveProperty: estree.Property,
  propagatedValue: estree.Node,
): IssueLocation | undefined {
  const isPropagatedProperty = sensitiveProperty.value !== propagatedValue;
  if (isPropagatedProperty) {
    return toSecondaryLocation(getNodeParent(propagatedValue), 'Propagated setting.');
  }
  return undefined;
}
