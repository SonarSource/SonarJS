/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2703

import { Rule } from 'eslint';
import { globalsByLibraries } from '../utils/globals';
import { flatMap } from './utils';

const message = (variable: string) =>
  `Add the "let", "const" or "var" keyword to this declaration of "${variable}" to make it explicit.`;

const excludedNames = new Set(flatMap(Object.values(globalsByLibraries), globals => globals));

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'Program:exit'() {
        const globalScope = context.getScope();
        const alreadyReported: Set<string> = new Set();
        globalScope.through
          .filter(ref => ref.isWrite())
          .forEach(ref => {
            const name = ref.identifier.name;
            if (!alreadyReported.has(name) && !excludedNames.has(name)) {
              alreadyReported.add(name);
              context.report({
                message: message(name),
                node: ref.identifier,
              });
            }
          });
      },
    };
  },
};
