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
import { Rule } from 'eslint';

import { decorateAccessorPairs } from './accessor-pairs-decorator';
import { decorateBraceStyle } from './brace-style-decorator';
import { decorateDefaultParamLast } from './default-param-last-decorator';
import { decorateJsxKey } from './jsx-key-decorator';
import { decorateJsxNoConstructedContextValues } from './jsx-no-constructed-context-values';
import { decorateNoBaseToString } from './no-base-to-string-decorator';
import { decorateNoDupeKeys } from './no-dupe-keys-decorator';
import { decorateNoDuplicateImports } from './no-duplicate-imports-decorator';
import { decorateNoEmpty } from './no-empty-decorator';
import { decorateNoEmptyFunction } from './no-empty-function-decorator';
import { decorateNoEmptyInterface } from './no-empty-interface-decorator';
import { decorateNoExtraSemi } from './no-extra-semi-decorator';
import { decorateNoRedeclare } from './no-redeclare-decorator';
import { decorateNoThisAlias } from './no-this-alias-decorator';
import { decorateNoThrowLiteral } from './no-throw-literal-decorator';
import { decorateNoUnreachable } from './no-unreachable-decorator';
import { decorateNoUnstableNestedComponents } from './no-unstable-nested-components';
import { decorateNoUnusedExpressions } from './no-unused-expressions-decorator';
import { decorateObjectShorthand } from './object-shorthand-decorator';
import { decoratePreferEnumInitializers } from './prefer-enum-initializers-decorator';
import { decoratePreferForOf } from './prefer-for-of-decorator';
import { decoratePreferFunctionType } from './prefer-function-type-decorator';
import { decoratePreferStringStartsEndsWithDecorator } from './prefer-string-starts-ends-with-decorator';
import { decoratePreferTemplate } from './prefer-template-decorator';
import { decorateSemi } from './semi-decorator';
import { decorateUseIsNan } from './use-isnan-decorator';
import { decorateNoVar } from './no-var-decorator';
import { decorateNoRedundantTypeConstituents } from './no-redundant-type-constituents';

/**
 * A decorator of an ESLint rule
 *
 * The purpose of a decorator is to refine the behaviour of external
 * ESLint rules. These refinements can include reducing the noise by
 * adding exceptions, extending the scope of the rule, adding quick fixes, etc.
 */
export type RuleDecorator = (rule: Rule.RuleModule) => Rule.RuleModule;

/**
 * The set of internal ESLint rule decorators
 *
 * Once declared here, these decorators are automatically applied
 * to the corresponding rule definitions by the linter's wrapper.
 * There is no further setup required to enable them, except when
 * one needs to test them using ESLint's rule tester.
 */
export const decorators: Record<string, RuleDecorator> = {
  'accessor-pairs': decorateAccessorPairs,
  'brace-style': decorateBraceStyle,
  'default-param-last': decorateDefaultParamLast,
  'jsx-key': decorateJsxKey,
  'jsx-no-constructed-context-values': decorateJsxNoConstructedContextValues,
  'no-base-to-string': decorateNoBaseToString,
  'no-dupe-keys': decorateNoDupeKeys,
  'no-duplicate-imports': decorateNoDuplicateImports,
  'no-empty': decorateNoEmpty,
  'no-empty-function': decorateNoEmptyFunction,
  'no-empty-interface': decorateNoEmptyInterface,
  'no-extra-semi': decorateNoExtraSemi,
  'no-redeclare': decorateNoRedeclare,
  'no-redundant-type-constituents': decorateNoRedundantTypeConstituents,
  'no-this-alias': decorateNoThisAlias,
  'no-throw-literal': decorateNoThrowLiteral,
  'no-unreachable': decorateNoUnreachable,
  'no-unstable-nested-components': decorateNoUnstableNestedComponents,
  'no-unused-expressions': decorateNoUnusedExpressions,
  'no-var': decorateNoVar,
  'object-shorthand': decorateObjectShorthand,
  'prefer-enum-initializers': decoratePreferEnumInitializers,
  'prefer-for-of': decoratePreferForOf,
  'prefer-function-type': decoratePreferFunctionType,
  'prefer-string-starts-ends-with': decoratePreferStringStartsEndsWithDecorator,
  'prefer-template': decoratePreferTemplate,
  semi: decorateSemi,
  'use-isnan': decorateUseIsNan,
};
