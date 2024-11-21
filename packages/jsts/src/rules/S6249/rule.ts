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
// https://sonarsource.github.io/rspec/#/rspec/S6249/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  getBucketProperty,
  getValueOfExpression,
  S3BucketTemplate,
} from '../helpers/index.js';
import { meta } from './meta.js';

const ENFORCE_SSL_KEY = 'enforceSSL';

const messages = {
  authorized: 'Make sure authorizing HTTP requests is safe here.',
  omitted: "Omitting 'enforceSSL' authorizes HTTP requests. Make sure it is safe here.",
};

export const rule: Rule.RuleModule = S3BucketTemplate(
  (bucket, context) => {
    const enforceSSLProperty = getBucketProperty(context, bucket, ENFORCE_SSL_KEY);
    if (enforceSSLProperty == null) {
      context.report({
        message: messages['omitted'],
        node: bucket.callee,
      });
      return;
    }

    const enforceSSLValue = getValueOfExpression(context, enforceSSLProperty.value, 'Literal');
    if (enforceSSLValue?.value === false) {
      context.report({
        message: messages['authorized'],
        node: enforceSSLProperty,
      });
    }
  },
  generateMeta(meta as Rule.RuleMetaData),
);
