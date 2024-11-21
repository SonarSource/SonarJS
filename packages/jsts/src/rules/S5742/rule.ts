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
// https://sonarsource.github.io/rspec/#/rspec/S5742/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import {
  Express,
  generateMeta,
  getFullyQualifiedName,
  getPropertyWithValue,
} from '../helpers/index.js';
import { meta } from './meta.js';

const HELMET = 'helmet';
const EXPECT_CERTIFICATE_TRANSPARENCY = 'expectCt';

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findFalseCertificateTransparencyPropertyFromHelmet,
  `Make sure disabling Certificate Transparency monitoring is safe here.`,
  generateMeta(meta as Rule.RuleMetaData, undefined, true),
);

/**
 * Looks for property `expectCt: false` in node looking
 * somewhat similar to `helmet(<options>?)`, and returns it.
 */
function findFalseCertificateTransparencyPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property[] {
  let sensitive: estree.Property | undefined;
  const { callee, arguments: args } = node;
  if (
    getFullyQualifiedName(context, callee) === HELMET &&
    args.length === 1 &&
    args[0].type === 'ObjectExpression'
  ) {
    sensitive = getPropertyWithValue(context, args[0], EXPECT_CERTIFICATE_TRANSPARENCY, false);
  }
  return sensitive ? [sensitive] : [];
}
