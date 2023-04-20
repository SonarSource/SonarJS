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
// https://sonarsource.github.io/rspec/#/rspec/S6601/javascript

import { Rule } from 'eslint';
import { interceptReport } from './helpers';

// The core implementation of the rule is too noisy and requires reducing its scope to numbers, strings, and BigInt-s.
// The rule also provides both fixes and suggestions. We then need to manually transform any fixes into suggestions.
export function decorateStrictBooleanExpressions(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  rule.meta!.messages = {
    ...rule.meta!.messages,
    defaultFix: 'Replace with a strict boolean expression',
  };
  return interceptReport(rule, (context, reportDescriptor) => {
    const { messageId, fix }: { messageId: string; fix?: Rule.ReportFixer | null } =
      reportDescriptor as any;
    if (messageId === 'conditionErrorNumber' || messageId === 'conditionErrorString') {
      if (fix != null) {
        const suggest = [{ messageId: 'defaultFix', fix }];
        delete reportDescriptor['fix'];
        reportDescriptor['suggest'] = suggest;
      }
      context.report({ ...reportDescriptor });
    }
  });
}
