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
// https://sonarsource.github.io/rspec/#/rspec/S6245/javascript

import type { Rule } from 'eslint';
import { MemberExpression } from 'estree';
import {
  findPropagatedSetting,
  generateMeta,
  getBucketProperty,
  getFullyQualifiedName,
  getValueOfExpression,
  normalizeFQN,
  report,
  S3BucketTemplate,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

const ENCRYPTED_KEY = 'encryption';

const messages = {
  unencrypted: 'Objects in the bucket are not encrypted. Make sure it is safe here.',
  omitted: 'Omitting "encryption" disables server-side encryption. Make sure it is safe here.',
};

export const rule: Rule.RuleModule = S3BucketTemplate((bucket, context) => {
  const encryptedProperty = getBucketProperty(context, bucket, ENCRYPTED_KEY);
  if (encryptedProperty == null) {
    report(context, {
      message: messages['omitted'],
      node: bucket.callee,
    });
    return;
  }

  const encryptedValue = getValueOfExpression(context, encryptedProperty.value, 'MemberExpression');
  if (encryptedValue && isUnencrypted(encryptedValue)) {
    const propagated = findPropagatedSetting(encryptedProperty, encryptedValue);
    report(
      context,
      {
        message: messages['unencrypted'],
        node: encryptedProperty,
      },
      propagated ? [propagated] : [],
    );
  }

  function isUnencrypted(encrypted: MemberExpression) {
    return (
      normalizeFQN(getFullyQualifiedName(context, encrypted)) ===
      'aws_cdk_lib.aws_s3.BucketEncryption.UNENCRYPTED'
    );
  }
}, generateMeta(meta));
