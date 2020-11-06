/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-5730

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getModuleNameOfNode, getObjectExpressionProperty, isCallToFQN } from './utils';
import { Express } from './utils-express';

const HELMET = 'helmet';
const HELMET_CSP = 'helmet-csp';
const DIRECTIVE = 'directive';
const CONTENT_SECURITY_POLICY = 'contentSecurityPolicy';
const BLOCK_ALL_MIXED_CONTENT_CAMEL = 'blockAllMixedContent';
const BLOCK_ALL_MIXED_CONTENT_HYPHEN = 'block-all-mixed-content';

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findDirectiveWithMissingMixedContentPropertyFromHelmet,
  `Make sure allowing mixed-content is safe here.`,
);

function findDirectiveWithMissingMixedContentPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  let sensitive: estree.Property | undefined;
  const { arguments: args } = node;
  if (args.length === 1) {
    const [options] = args;
    const maybeDirective = getObjectExpressionProperty(options, DIRECTIVE);
    if (
      maybeDirective &&
      isMissingMixedContentProperty(maybeDirective) &&
      isValidHelmetModuleCall(context, node)
    ) {
      sensitive = maybeDirective;
    }
  }
  return sensitive ? [sensitive] : [];
}

function isValidHelmetModuleCall(context: Rule.RuleContext, callExpr: estree.CallExpression) {
  const { callee } = callExpr;

  /* csp(options) */
  if (callee.type === 'Identifier' && getModuleNameOfNode(context, callee)?.value === HELMET_CSP) {
    return true;
  }

  /* helmet.contentSecurityPolicy(options) */
  return isCallToFQN(context, callExpr, HELMET, CONTENT_SECURITY_POLICY);
}

function isMissingMixedContentProperty(directive: estree.Property): boolean {
  return !(
    Boolean(getObjectExpressionProperty(directive.value, BLOCK_ALL_MIXED_CONTENT_CAMEL)) ||
    Boolean(getObjectExpressionProperty(directive.value, BLOCK_ALL_MIXED_CONTENT_HYPHEN))
  );
}
