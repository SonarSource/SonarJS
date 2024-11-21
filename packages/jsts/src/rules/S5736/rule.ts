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
// https://sonarsource.github.io/rspec/#/rspec/S5736/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  Express,
  generateMeta,
  getFullyQualifiedName,
  getProperty,
  getPropertyWithValue,
} from '../helpers/index.js';
import { meta } from './meta.js';

const HELMET = 'helmet';
const POLICY = 'policy';
const REFERRER_POLICY = 'referrerPolicy';
const UNSAFE_REFERRER_POLICY_VALUES = ['', 'unsafe-url', 'no-referrer-when-downgrade'];

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findNoReferrerPolicyPropertyFromHelmet,
  `Make sure disabling strict HTTP no-referrer policy is safe here.`,
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);

function findNoReferrerPolicyPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  let sensitive: estree.Property | undefined;

  const { callee, arguments: args } = node;
  if (args.length === 1) {
    const [options] = args;

    /* helmet({ referrerPolicy: false }) or helmet.referrerPolicy({ policy: <unsafe_value> }) */
    const fqn = getFullyQualifiedName(context, callee);
    if (fqn === HELMET && options.type === 'ObjectExpression') {
      sensitive = getPropertyWithValue(context, options, REFERRER_POLICY, false);
    } else if (fqn === `${HELMET}.${REFERRER_POLICY}`) {
      const maybePolicy = getProperty(options, POLICY, context);
      if (maybePolicy && !isSafePolicy(maybePolicy)) {
        sensitive = maybePolicy;
      }
    }
  }

  return sensitive ? [sensitive] : [];
}

function isSafePolicy(policy: estree.Property): boolean {
  const { value } = policy;
  const values: Array<estree.Node | null> =
    value.type === 'ArrayExpression' ? value.elements : [value];
  const sensitiveValue = values.find(
    v =>
      v?.type === 'Literal' &&
      typeof v.value === 'string' &&
      UNSAFE_REFERRER_POLICY_VALUES.includes(v.value),
  );
  return !Boolean(sensitiveValue);
}
