/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6281/javascript

import type { Rule } from 'eslint';
import type { NewExpression, ObjectExpression, Property } from 'estree';
import { findPropagatedSetting, getBucketProperty, S3BucketTemplate } from '../helpers/aws/s3.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { getValueOfExpression, isIdentifier, isProperty } from '../helpers/ast.js';
import { normalizeFQN } from '../helpers/aws/cdk.js';
import { report } from '../helpers/location.js';
import * as meta from './generated-meta.js';

const BLOCK_PUBLIC_ACCESS_KEY = 'blockPublicAccess';
const BLOCK_PUBLIC_ACCESS_PROPERTY_KEYS = [
  'blockPublicAcls',
  'blockPublicPolicy',
  'ignorePublicAcls',
  'restrictPublicBuckets',
];

const messages = {
  public:
    'Disabling public access block settings allows public ACL/policies to be set on this S3 bucket.',
  blockAclsOnly: 'Using BLOCK_ACLS_ONLY allows public access via bucket policies.',
};

export const rule: Rule.RuleModule = S3BucketTemplate((bucket, context) => {
  const blockPublicAccess = getBucketProperty(context, bucket, BLOCK_PUBLIC_ACCESS_KEY);
  if (blockPublicAccess != null) {
    checkBlockPublicAccessValue(blockPublicAccess);
    checkBlockPublicAccessConstructor(blockPublicAccess);
  }

  /** Checks `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY` sensitive pattern */
  function checkBlockPublicAccessValue(blockPublicAccess: Property) {
    const blockPublicAccessMember = getValueOfExpression(
      context,
      blockPublicAccess.value,
      'MemberExpression',
    );
    if (
      blockPublicAccessMember !== undefined &&
      normalizeFQN(getFullyQualifiedName(context, blockPublicAccessMember)) ===
        'aws_cdk_lib.aws_s3.BlockPublicAccess.BLOCK_ACLS_ONLY'
    ) {
      const propagated = findPropagatedSetting(blockPublicAccess, blockPublicAccessMember);
      report(
        context,
        {
          message: messages['blockAclsOnly'],
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
      if (blockPublicAccessConfig !== undefined) {
        for (const key of BLOCK_PUBLIC_ACCESS_PROPERTY_KEYS) {
          checkBlockPublicAccessConstructorProperty(blockPublicAccessConfig, key);
        }
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
}, generateMeta(meta));
