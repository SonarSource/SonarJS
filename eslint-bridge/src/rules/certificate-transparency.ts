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
// https://jira.sonarsource.com/browse/RSPEC-5742

import { Rule } from 'eslint';
import * as estree from 'estree';
import { Express, getModuleNameOfNode, getPropertyWithValue } from './utils';

const HELMET = 'helmet';
const EXPECT_CERTIFICATE_TRANSPARENCY = 'expectCt';

export const rule: Rule.RuleModule = Express.SensitiveMiddlewarePropertyRule(
  findFalseCertificateTransparencyPropertyFromHelmet,
  `Make sure disabling Certificate Transparency monitoring is safe here.`,
);

/**
 * Looks for property `expectCt: false` in node looking
 * somewhat similar to `helmet(<options>?)`, and returns it.
 */
function findFalseCertificateTransparencyPropertyFromHelmet(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Property | undefined {
  const { callee, arguments: args } = node;
  if (
    callee.type === 'Identifier' &&
    getModuleNameOfNode(context, callee)?.value === HELMET &&
    args.length === 1 &&
    args[0].type === 'ObjectExpression'
  ) {
    return getPropertyWithValue(context, args[0], EXPECT_CERTIFICATE_TRANSPARENCY, false);
  }
  return undefined;
}
