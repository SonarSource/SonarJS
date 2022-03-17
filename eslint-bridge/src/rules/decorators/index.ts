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
import { decorateAccessorPairs } from './accessor-pairs-decorator';
import { decorateNoDupeKeys } from './no-dupe-keys-decorator';
import { decorateNoRedeclare } from './no-redeclare-decorator';
import { decorateNoThrowLiteral } from './no-throw-literal-decorator';
import { decorateNoUnreachable } from './no-unreachable-decorator';
import { decorateObjectShorthand } from './object-shorthand-decorator';
import { decoratePreferTemplate } from './prefer-template-decorator';

export const externalRuleDecorators = [
  { decorate: decorateAccessorPairs, ruleKey: 'accessor-pairs' },
  { decorate: decoratePreferTemplate, ruleKey: 'prefer-template' },
  { decorate: decorateNoRedeclare, ruleKey: 'no-redeclare' },
  { decorate: decorateObjectShorthand, ruleKey: 'object-shorthand' },
  { decorate: decorateNoDupeKeys, ruleKey: 'no-dupe-keys' },
  { decorate: decorateNoThrowLiteral, ruleKey: 'no-throw-literal' },
  { decorate: decorateNoUnreachable, ruleKey: 'no-unreachable' },
];
