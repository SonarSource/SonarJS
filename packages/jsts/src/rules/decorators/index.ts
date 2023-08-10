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
export const decorators: Record<string, RuleDecorator> = {};
