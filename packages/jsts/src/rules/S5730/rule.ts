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
// https://sonarsource.github.io/rspec/#/rspec/S5730/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { Express, generateMeta, getFullyQualifiedName, getProperty } from '../helpers/index.js';
import { meta } from './meta.js';

const HELMET = 'helmet';
const HELMET_CSP = 'helmet-csp';
const DIRECTIVES = 'directives';
const CONTENT_SECURITY_POLICY = 'contentSecurityPolicy';
const BLOCK_ALL_MIXED_CONTENT_CAMEL = 'blockAllMixedContent';
const BLOCK_ALL_MIXED_CONTENT_HYPHEN = 'block-all-mixed-content';

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findDirectivesWithMissingMixedContentPropertyFromHelmet,
  `Make sure allowing mixed-content is safe here.`,
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);

function findDirectivesWithMissingMixedContentPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  let sensitive: estree.Property | undefined;
  const { arguments: args } = node;
  if (args.length === 1) {
    const [options] = args;
    const maybeDirectives = getProperty(options, DIRECTIVES, context);
    if (
      maybeDirectives &&
      isMissingMixedContentProperty(maybeDirectives, context) &&
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

function isMissingMixedContentProperty(
  directives: estree.Property,
  context: Rule.RuleContext,
): boolean {
  return !(
    Boolean(getProperty(directives.value, BLOCK_ALL_MIXED_CONTENT_CAMEL, context)) ||
    Boolean(getProperty(directives.value, BLOCK_ALL_MIXED_CONTENT_HYPHEN, context))
  );
}
