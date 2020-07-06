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

import { Rule } from 'eslint';
import * as estree from 'estree';

/**
 * Modifies the behavior of `context.report(descriptor)` for a given rule.
 *
 * For example, allows to use a standard eslint rule, but also perform
 * additional library/framework-specific checks before reporting an issue.
 *
 * @param rule the original rule
 * @param onReport replacement for `context.report(descr)`
 *                 invocations used inside of the rule
 */
export function interceptReport(
  rule: Rule.RuleModule,
  onReport: (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void,
): Rule.RuleModule {
  return {
    meta: rule.meta,
    create(originalContext: Rule.RuleContext) {
      const interceptingContext: Rule.RuleContext = {
        id: originalContext.id,
        options: originalContext.options,
        settings: originalContext.settings,
        parserPath: originalContext.parserPath,
        parserOptions: originalContext.parserOptions,
        parserServices: originalContext.parserServices,

        getAncestors() {
          return originalContext.getAncestors();
        },

        getDeclaredVariables(node: estree.Node) {
          return originalContext.getDeclaredVariables(node);
        },

        getFilename() {
          return originalContext.getFilename();
        },

        getScope() {
          return originalContext.getScope();
        },

        getSourceCode() {
          return originalContext.getSourceCode();
        },

        markVariableAsUsed(name: string) {
          return originalContext.markVariableAsUsed(name);
        },

        report(descriptor: Rule.ReportDescriptor): void {
          onReport(originalContext, descriptor);
        },
      };
      return rule.create(interceptingContext);
    },
  };
}
