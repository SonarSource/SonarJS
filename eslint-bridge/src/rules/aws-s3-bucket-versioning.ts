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
import { S3BucketTemplate } from '../utils/s3-rule-template';
import * as estree from 'estree';
import { getValueOfExpression, isProperty, isIdentifier } from '../utils';

const VERSIONED_KEY = 'versioned';

const messages = {
  default: 'Make sure using unversioned S3 bucket is safe here.',
  omitted:
    'Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.',
};

export const rule: Rule.RuleModule = S3BucketTemplate((node, context) => {
  const requiredArg = findRequiredArgument(context, node.arguments as estree.Expression[]);
  if (requiredArg == null) {
    context.report({
      message: messages['omitted'],
      node: node.callee,
    });
    return;
  }

  const argumentValue = getValueOfExpression(context, requiredArg.value, 'Literal');
  if (argumentValue?.value !== true) {
    context.report({
      message: messages['default'],
      node: requiredArg.value,
    });
  }
});

function findRequiredArgument(context: Rule.RuleContext, args: estree.Expression[]) {
  if (!hasEnoughArgs(args)) {
    return null;
  }
  const optionsArg = args[2];
  const options = getValueOfExpression(context, optionsArg, 'ObjectExpression');
  if (options == null) {
    return null;
  }
  return options.properties.find(
    property => isProperty(property) && isIdentifier(property.key, VERSIONED_KEY),
  ) as estree.Property | undefined;

  function hasEnoughArgs(args: estree.Expression[]) {
    return args.length >= 3;
  }
}
