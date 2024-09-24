/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6281/javascript

import { Rule } from 'eslint';
import { NewExpression, ObjectExpression, Property } from 'estree';
import {
  findPropagatedSetting,
  generateMeta,
  getBucketProperty,
  getFullyQualifiedName,
  getValueOfExpression,
  isIdentifier,
  isProperty,
  normalizeFQN,
  report,
  S3BucketTemplate,
} from '../helpers/index.ts';
import { meta } from './meta.ts';

const BLOCK_PUBLIC_ACCESS_KEY = 'blockPublicAccess';
const BLOCK_PUBLIC_ACCESS_PROPERTY_KEYS = [
  'blockPublicAcls',
  'blockPublicPolicy',
  'ignorePublicAcls',
  'restrictPublicBuckets',
];

const messages = {
  omitted:
    'No Public Access Block configuration prevents public ACL/policies ' +
    'to be set on this S3 bucket. Make sure it is safe here.',
  public: 'Make sure allowing public ACL/policies to be set is safe here.',
};

export const rule: Rule.RuleModule = S3BucketTemplate(
  (bucket, context) => {
    const blockPublicAccess = getBucketProperty(context, bucket, BLOCK_PUBLIC_ACCESS_KEY);
    if (blockPublicAccess == null) {
      report(context, {
        message: messages['omitted'],
        node: bucket.callee,
      });
    } else {
      checkBlockPublicAccessValue(blockPublicAccess);
      checkBlockPublicAccessConstructor(blockPublicAccess);
    }

    /** Checks `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS` sensitive pattern */
    function checkBlockPublicAccessValue(blockPublicAccess: Property) {
      const blockPublicAccessMember = getValueOfExpression(
        context,
        blockPublicAccess.value,
        'MemberExpression',
      );
      if (
        blockPublicAccessMember !== undefined &&
        normalizeFQN(getFullyQualifiedName(context, blockPublicAccessMember)) ===
          'aws_cdk_lib.aws_s3.BlockPublicAccess.BLOCK_ACLS'
      ) {
        const propagated = findPropagatedSetting(blockPublicAccess, blockPublicAccessMember);
        report(
          context,
          {
            message: messages['public'],
            node: blockPublicAccess,
          },
          propagated ? [propagated] : [],
        );
      }
    }

    /** Checks `blockPublicAccess: new s3.BlockPublicAccess({...})` sensitive pattern */
    function checkBlockPublicAccessConstructor(blockPublicAccess: Property) {
      const blockPublicAccessNew = getValueOfExpression(
        context,
        blockPublicAccess.value,
        'NewExpression',
      );
      if (
        blockPublicAccessNew !== undefined &&
        isS3BlockPublicAccessConstructor(blockPublicAccessNew)
      ) {
        const blockPublicAccessConfig = getValueOfExpression(
          context,
          blockPublicAccessNew.arguments[0],
          'ObjectExpression',
        );
        if (blockPublicAccessConfig === undefined) {
          report(context, {
            message: messages['omitted'],
            node: blockPublicAccessNew,
          });
        } else {
          BLOCK_PUBLIC_ACCESS_PROPERTY_KEYS.forEach(key =>
            checkBlockPublicAccessConstructorProperty(blockPublicAccessConfig, key),
          );
        }
      }

      function checkBlockPublicAccessConstructorProperty(
        blockPublicAccessConfig: ObjectExpression,
        key: string,
      ) {
        const blockPublicAccessProperty = blockPublicAccessConfig.properties.find(
          property => isProperty(property) && isIdentifier(property.key, key),
        ) as Property | undefined;
        if (blockPublicAccessProperty !== undefined) {
          const blockPublicAccessValue = getValueOfExpression(
            context,
            blockPublicAccessProperty.value,
            'Literal',
          );
          if (blockPublicAccessValue?.value === false) {
            const propagated = findPropagatedSetting(
              blockPublicAccessProperty,
              blockPublicAccessValue,
            );
            report(
              context,
              {
                message: messages['public'],
                node: blockPublicAccessProperty,
              },
              propagated ? [propagated] : [],
            );
          }
        }
      }

      function isS3BlockPublicAccessConstructor(expr: NewExpression) {
        return (
          expr.callee.type === 'MemberExpression' &&
          normalizeFQN(getFullyQualifiedName(context, expr.callee)) ===
            'aws_cdk_lib.aws_s3.BlockPublicAccess'
        );
      }
    }
  },
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);
