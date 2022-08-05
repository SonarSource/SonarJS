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

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleAndCalledMethod,
  getNodeParent,
  getValueOfExpression,
  isIdentifier,
  isProperty,
} from '.';

/**
 * A rule template for AWS S3 Buckets
 *
 * The rule template allows to detect sensitive configuration passed on
 * the invocation of S3 Bucket's constructor from AWS CDK:
 *
 * ```new s3.Bucket(...)```
 *
 * @param callback the callback invoked on visiting S3 Bucket's instantiation
 * @param metadata the instantiated rule metadata
 * @returns the instantiated rule definition
 */
export function S3BucketTemplate(
  callback: (bucketConstructor: estree.NewExpression, context: Rule.RuleContext) => void,
  metadata: { meta: Rule.RuleMetaData } = { meta: {} },
): Rule.RuleModule {
  return {
    ...metadata,
    create(context: Rule.RuleContext) {
      return {
        NewExpression: (node: estree.NewExpression) => {
          if (isS3BucketConstructor(node, context)) {
            callback(node, context);
          }
        },
      };
    },
  };

  function isS3BucketConstructor(node: estree.NewExpression, context: Rule.RuleContext) {
    const { module, method } = getModuleAndCalledMethod(node.callee, context);
    return module?.value === 'aws-cdk-lib/aws-s3' && isIdentifier(method, 'Bucket');
  }
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
export function getProperty(context: Rule.RuleContext, bucket: estree.NewExpression, key: string) {
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
) {
  const propagated = { locations: [] as estree.Node[], messages: [] as string[] };
  const isPropagatedProperty = sensitiveProperty.value !== propagatedValue;
  if (isPropagatedProperty) {
    propagated.locations = [getNodeParent(propagatedValue)];
    propagated.messages = ['Propagated setting.'];
  }
  return propagated;
}
