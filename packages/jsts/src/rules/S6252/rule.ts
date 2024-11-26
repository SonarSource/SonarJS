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
// https://sonarsource.github.io/rspec/#/rspec/S6252/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  getBucketProperty,
  getNodeParent,
  getValueOfExpression,
  IssueLocation,
  report,
  S3BucketTemplate,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

const VERSIONED_KEY = 'versioned';

const messages = {
  unversioned: 'Make sure using unversioned S3 bucket is safe here.',
  omitted:
    'Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.',
  secondary: 'Propagated setting',
};

export const rule: Rule.RuleModule = S3BucketTemplate(
  (bucketConstructor, context) => {
    const versionedProperty = getBucketProperty(context, bucketConstructor, VERSIONED_KEY);
    if (versionedProperty == null) {
      report(context, {
        message: messages.omitted,
        node: bucketConstructor.callee,
      });
      return;
    }
    const propertyLiteralValue = getValueOfExpression(context, versionedProperty.value, 'Literal');

    if (propertyLiteralValue?.value === false) {
      const secondaries: IssueLocation[] = [];
      const isPropagatedProperty = versionedProperty.value !== propertyLiteralValue;
      if (isPropagatedProperty) {
        secondaries.push(
          toSecondaryLocation(getNodeParent(propertyLiteralValue), messages.secondary),
        );
      }
      report(
        context,
        {
          message: messages.unversioned,
          node: versionedProperty,
        },
        secondaries,
      );
    }
  },
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);
