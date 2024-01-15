/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5730/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { Express, getObjectExpressionProperty, getFullyQualifiedName } from '../helpers';

const HELMET = 'helmet';
const HELMET_CSP = 'helmet-csp';
const DIRECTIVES = 'directives';
const CONTENT_SECURITY_POLICY = 'contentSecurityPolicy';
const BLOCK_ALL_MIXED_CONTENT_CAMEL = 'blockAllMixedContent';
const BLOCK_ALL_MIXED_CONTENT_HYPHEN = 'block-all-mixed-content';

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findDirectivesWithMissingMixedContentPropertyFromHelmet,
  `Make sure allowing mixed-content is safe here.`,
);

function findDirectivesWithMissingMixedContentPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  let sensitive: estree.Property | undefined;
  const { arguments: args } = node;
  if (args.length === 1) {
    const [options] = args;
    const maybeDirectives = getObjectExpressionProperty(options, DIRECTIVES);
    if (
      maybeDirectives &&
      isMissingMixedContentProperty(maybeDirectives) &&
      isValidHelmetModuleCall(context, node)
    ) {
      sensitive = maybeDirectives;
    }
  }
  return sensitive ? [sensitive] : [];
}

function isValidHelmetModuleCall(context: Rule.RuleContext, callExpr: estree.CallExpression) {
  const fqn = getFullyQualifiedName(context, callExpr);
  return fqn === `${HELMET}.${CONTENT_SECURITY_POLICY}` || fqn === HELMET_CSP;
}

function isMissingMixedContentProperty(directives: estree.Property): boolean {
  return !(
    Boolean(getObjectExpressionProperty(directives.value, BLOCK_ALL_MIXED_CONTENT_CAMEL)) ||
    Boolean(getObjectExpressionProperty(directives.value, BLOCK_ALL_MIXED_CONTENT_HYPHEN))
  );
}
