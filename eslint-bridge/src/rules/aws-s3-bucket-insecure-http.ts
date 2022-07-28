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
// https://sonarsource.github.io/rspec/#/rspec/S6249/javascript

import { Rule } from 'eslint';
import { Property } from 'estree';
import { getValueOfExpression, isIdentifier, isProperty, S3BucketTemplate } from '../utils';

export const rule: Rule.RuleModule = S3BucketTemplate((node, context) => {
  const configuration = getValueOfExpression(context, node.arguments[2], 'ObjectExpression');

  if (configuration) {
    const enforceSSLProperty = configuration.properties.find(
      property => isProperty(property) && isIdentifier(property.key, 'enforceSSL'),
    ) as Property | undefined;

    if (enforceSSLProperty) {
      const enforceSSLValue = getValueOfExpression(context, enforceSSLProperty.value, 'Literal');

      if (enforceSSLValue?.value === false) {
        context.report({
          message: 'Make sure authorizing HTTP requests is safe here.',
          node: enforceSSLProperty.key,
        });
      }
      return;
    }
  }

  context.report({
    message: "Omitting 'enforceSSL' authorizes HTTP requests. Make sure it is safe here.",
    node: node.callee,
  });
});
