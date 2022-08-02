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
// https://sonarsource.github.io/rspec/#/rspec/S6252/javascript

import { Rule } from 'eslint';
import { getValueOfExpression, getProperty, S3BucketTemplate } from '../utils';

const VERSIONED_KEY = 'versioned';

const messages = {
  default: 'Make sure using unversioned S3 bucket is safe here.',
  omitted:
    'Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.',
  secondary: 'Propagated setting.',
};

export const rule: Rule.RuleModule = S3BucketTemplate((bucketConstructor, context) => {
  const versionedProperty = getProperty(context, bucketConstructor, VERSIONED_KEY);
  if (versionedProperty == null) {
    context.report({
      message: messages['omitted'],
      node: bucketConstructor.callee,
    });
    return;
  }

  const argumentValue = getValueOfExpression(context, versionedProperty.value, 'Literal');
  if (argumentValue?.value !== true) {
    context.report({
      message: messages['default'],
      node: versionedProperty,
    });
  }
});
