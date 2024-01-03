/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import * as stylelint from 'stylelint';
import { rule as S125 } from './S125';
import { rule as S5362 } from './S5362';

/**
 * The set of internal Stylelint-based rules
 */
const rules: { [key: string]: stylelint.Rule } = {};

/**
 * Maps Stylelint rule keys to rule implementations
 */
rules[S125.ruleName] = S125.rule; // no-commented-code
rules[S5362.ruleName] = S5362.rule; // function-calc-no-invalid

export { rules };
