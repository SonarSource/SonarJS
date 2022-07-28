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

const messages = {
  default: 'Make sure an unversioned S3 bucket is safe here.',
  omitted: 'Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.',
};

export const rule: Rule.RuleModule = S3BucketTemplate((node, context) => {
// check if has params arg
const requiredArg = findRequiredArgument(node.arguments);
if (requiredArg == null) {
  context.report({
    message: messages['omitted'],
    node,
  });
  return;
}

if (requiredArg.value.computed !== true) {
  context.report({
    message: messages['default'],
    node: requiredArg.value,
  });
}
});

function findRequiredArgument(args: any[]) {
  if (args.length < 3) {
    return false;
  }
  return args[2]?.properties.find((prop: any) => prop.key?.name === 'versioned');
}
