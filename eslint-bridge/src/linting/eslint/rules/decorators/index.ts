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
import { decorateDefaultParamLast } from './default-param-last-decorator';
import { decorateNoDupeKeys } from './no-dupe-keys-decorator';
import { decorateNoDuplicateImports } from './no-duplicate-imports-decorator';
import { decorateNoEmpty } from './no-empty-decorator';
import { decorateNoEmptyFunction } from './no-empty-function-decorator';
import { decorateNoExtraSemi } from './no-extra-semi-decorator';
import { decorateNoRedeclare } from './no-redeclare-decorator';
import { decorateNoThrowLiteral } from './no-throw-literal-decorator';
import { decorateNoUnreachable } from './no-unreachable-decorator';
import { decorateNoUnusedExpressions } from './no-unused-expressions-decorator';
import { decorateObjectShorthand } from './object-shorthand-decorator';
import { decoratePreferForOf } from './prefer-for-of-decorator';
import { decoratePreferTemplate } from './prefer-template-decorator';
import { decorateUseIsNan } from './use-isnan-decorator';

/**
 * The set of internal ESLint rule decorators
 *
 * The purpose of these decorators is to refine the behaviour of
 * external ESLint rules. These refinements can include reducing
 * the noise by adding exceptions, extending the scope of a rule,
 * adding the support of quick fixes, etc.
 *
 * Once declared here, these decorators are automatically applied
 * to the corresponding rule definitions by the linter's wrapper.
 * There is no further setup required to enable them, except when
 * one needs to test them using ESLint's rule tester.
 */
export const decorators = [
  { decorate: decorateAccessorPairs, ruleKey: 'accessor-pairs' },
  { decorate: decorateDefaultParamLast, ruleKey: 'default-param-last' },
  { decorate: decorateNoDupeKeys, ruleKey: 'no-dupe-keys' },
  { decorate: decorateNoDuplicateImports, ruleKey: 'no-duplicate-imports' },
  { decorate: decorateNoEmpty, ruleKey: 'no-empty' },
  { decorate: decorateNoEmptyFunction, ruleKey: 'no-empty-function' },
  { decorate: decorateNoExtraSemi, ruleKey: 'no-extra-semi' },
  { decorate: decorateNoRedeclare, ruleKey: 'no-redeclare' },
  { decorate: decorateNoThrowLiteral, ruleKey: 'no-throw-literal' },
  { decorate: decorateNoUnreachable, ruleKey: 'no-unreachable' },
  { decorate: decorateNoUnusedExpressions, ruleKey: 'no-unused-expressions' },
  { decorate: decorateObjectShorthand, ruleKey: 'object-shorthand' },
  { decorate: decoratePreferForOf, ruleKey: 'prefer-for-of' },
  { decorate: decoratePreferTemplate, ruleKey: 'prefer-template' },
  { decorate: decorateUseIsNan, ruleKey: 'use-isnan' },
];
