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
// https://sonarsource.github.io/rspec/#/rspec/S6551/javascript

import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { isGenericType, interceptReport } from '../helpers';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(rspecMeta as Rule.RuleMetaData, rule.meta!),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const services = context.sourceCode.parserServices;
        if (isGenericType(reportDescriptor.node as TSESTree.Node, services)) {
          // we skip
        } else {
          context.report(reportDescriptor);
        }
      }
    },
  );
}
