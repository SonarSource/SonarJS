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
// https://sonarsource.github.io/rspec/#/rspec/S6788/javascript

import { Rule } from 'eslint';
import { interceptReport } from '../helpers';

// Rewording issue message reported by the core implementation.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.messages!['noFindDOMNode'] =
    "Do not use findDOMNode. It doesn't work with function components and is deprecated in StrictMode.";
  return interceptReport(rule, (context, reportDescriptor) => {
    context.report({
      ...reportDescriptor,
    });
  });
}
