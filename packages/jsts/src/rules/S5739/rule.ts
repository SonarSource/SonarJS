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
// https://sonarsource.github.io/rspec/#/rspec/S5734/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  Express,
  getPropertyWithValue,
  getValueOfExpression,
  getFullyQualifiedName,
  getProperty,
} from '../helpers';

const HSTS = 'hsts';
const HELMET = 'helmet';
const MAX_AGE = 'maxAge';
const INCLUDE_SUB_DOMAINS = 'includeSubDomains';
const RECOMMENDED_MAX_AGE = 15552000;

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findSensitiveTransportSecurityPolicyProperty,
  `Disabling Strict-Transport-Security policy is security-sensitive.`,
);

function findSensitiveTransportSecurityPolicyProperty(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  const sensitiveFinders = [findSensitiveHsts, findSensitiveMaxAge, findSensitiveIncludeSubDomains];
  const sensitives: estree.Property[] = [];
  const { callee, arguments: args } = node;
  if (args.length === 1 && args[0].type === 'ObjectExpression') {
    const [options] = args;
    for (const finder of sensitiveFinders) {
      const maybeSensitive = finder(context, callee, options);
      if (maybeSensitive) {
        sensitives.push(maybeSensitive);
      }
    }
  }
  return sensitives;
}

function findSensitiveHsts(
  context: Rule.RuleContext,
  middleware: estree.Node,
  options: estree.ObjectExpression,
): estree.Property | undefined {
  if (getFullyQualifiedName(context, middleware) === HELMET) {
    return getPropertyWithValue(context, options, HSTS, false);
  }
  return undefined;
}

function findSensitiveMaxAge(
  context: Rule.RuleContext,
  middleware: estree.Node,
  options: estree.ObjectExpression,
): estree.Property | undefined {
  if (isHstsMiddlewareNode(context, middleware)) {
    const maybeMaxAgeProperty = getProperty(options, MAX_AGE, context);
    if (maybeMaxAgeProperty) {
      const maybeMaxAgeValue = getValueOfExpression(context, maybeMaxAgeProperty.value, 'Literal');
      if (
        typeof maybeMaxAgeValue?.value === 'number' &&
        maybeMaxAgeValue.value < RECOMMENDED_MAX_AGE
      ) {
        return maybeMaxAgeProperty;
      }
    }
  }
  return undefined;
}

function findSensitiveIncludeSubDomains(
  context: Rule.RuleContext,
  middleware: estree.Node,
  options: estree.ObjectExpression,
): estree.Property | undefined {
  if (isHstsMiddlewareNode(context, middleware)) {
    return getPropertyWithValue(context, options, INCLUDE_SUB_DOMAINS, false);
  }
  return undefined;
}

function isHstsMiddlewareNode(context: Rule.RuleContext, node: estree.Node): boolean {
  const fqn = getFullyQualifiedName(context, node);
  return fqn === `${HELMET}.${HSTS}` || fqn === HSTS;
}
