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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import { Rule } from 'eslint';
import { rule as detectReact } from '../utils/rule-detect-react';
import { rules as reactRules } from 'eslint-plugin-react';
import { interceptReport, mergeRules } from '../utils';

const noUnusedClassComponentMethod = reactRules['no-unused-class-component-methods'];

export const rule: Rule.RuleModule = {
  // meta of no-dupe-keys and jsx-no-duplicate-props is required for issue messages
  meta: {
    messages: { ...detectReact.meta!.messages, ...noUnusedClassComponentMethod.meta!.messages },
  },
  create(context: Rule.RuleContext) {
    const detectReactListener: Rule.RuleListener = detectReact.create(context);
    const noUnusedClassComponentMethodListener: Rule.RuleListener =
      noUnusedClassComponentMethod.create(context);

    return mergeRules(detectReactListener, noUnusedClassComponentMethodListener);
  },
};

export function decorateSonarNoUnusedClassComponentMethod(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, reportExempting());
}

function reportExempting(): (
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
) => void {
  let react = false;
  return (context, reportDescriptor) => {
    if (
      ('messageId' in reportDescriptor && reportDescriptor.messageId === 'reactDetected') ||
      ('message' in reportDescriptor && reportDescriptor.message === 'React detected')
    ) {
      react = true;
    } else if (react) {
      if ('message' in reportDescriptor) {
        reportDescriptor.message = `${reportDescriptor.message} inside component scope.`;
      }
      context.report(reportDescriptor);
    }
  };
}
