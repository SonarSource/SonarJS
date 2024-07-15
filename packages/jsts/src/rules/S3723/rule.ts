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
// https://sonarsource.github.io/rspec/#/rspec/S3723/javascript

import { eslintRules } from '../core';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';
import { Rule } from 'eslint';

/**
 * S1537 ('comma-dangle') and S3723 ('enforce-trailing-comma') both depend on the
 * same ESLint implementation, but the plugin doesn't allow rule key duplicates.
 */
export const rule = {
  ...eslintRules['comma-dangle'],
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, eslintRules['comma-dangle'].meta),
};
