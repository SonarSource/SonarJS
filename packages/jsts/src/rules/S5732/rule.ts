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
// https://sonarsource.github.io/rspec/#/rspec/S5732/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { Express, generateMeta, getFullyQualifiedName, getProperty } from '../helpers/index.js';
import { meta } from './meta.js';

const HELMET = 'helmet';
const HELMET_CSP = 'helmet-csp';
const DIRECTIVES = 'directives';
const NONE = "'none'";
const CONTENT_SECURITY_POLICY = 'contentSecurityPolicy';
const FRAME_ANCESTORS_CAMEL = 'frameAncestors';
const FRAME_ANCESTORS_HYPHEN = 'frame-ancestors';

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findDirectivesWithSensitiveFrameAncestorsPropertyFromHelmet,
  `Make sure disabling content security policy frame-ancestors directive is safe here.`,
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);

function findDirectivesWithSensitiveFrameAncestorsPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  const { arguments: args } = node;
  if (isValidHelmetModuleCall(context, node) && args.length === 1) {
    const [options] = args;
    const maybeDirectives = getProperty(options, DIRECTIVES, context);
    if (maybeDirectives) {
      const maybeFrameAncestors = getFrameAncestorsProperty(maybeDirectives, context);
      if (!maybeFrameAncestors) {
        return [maybeDirectives];
      }
      if (isSetNoneFrameAncestorsProperty(maybeFrameAncestors)) {
        return [maybeFrameAncestors];
      }
    }
  }
  return [];
}

function isValidHelmetModuleCall(context: Rule.RuleContext, callExpr: estree.CallExpression) {
  /* csp(options) or helmet.contentSecurityPolicy(options) */
  const fqn = getFullyQualifiedName(context, callExpr);
  return fqn === HELMET_CSP || fqn === `${HELMET}.${CONTENT_SECURITY_POLICY}`;
}

function isSetNoneFrameAncestorsProperty(frameAncestors: estree.Property): boolean {
  const { value } = frameAncestors;
  return (
    value.type === 'ArrayExpression' &&
    Boolean(
      value.elements.find(
        v => v?.type === 'Literal' && typeof v.value === 'string' && v.value === NONE,
      ),
    )
  );
}

function getFrameAncestorsProperty(
  directives: estree.Property,
  context: Rule.RuleContext,
): estree.Property | undefined {
  const propertyKeys = [FRAME_ANCESTORS_CAMEL, FRAME_ANCESTORS_HYPHEN];
  for (const propertyKey of propertyKeys) {
    const maybeProperty = getProperty(directives.value, propertyKey, context);
    if (maybeProperty) {
      return maybeProperty;
    }
  }
  return undefined;
}
