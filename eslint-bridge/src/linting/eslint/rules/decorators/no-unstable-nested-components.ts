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
// https://sonarsource.github.io/rspec/#/rspec/S6478/javascript

import { Rule } from 'eslint';
import { interceptReport } from './helpers';

export function decorateNoUnstableNestedComponents(rule: Rule.RuleModule): Rule.RuleModule {
  // interceptReport() by default doesn't work with the React plugin as the rules fail to find the context getFirstTokens() function.
  return interceptReport(rule, messageChanger(urlRemover()), overrideContextReport);
}

function overrideContextReport(
  context: Rule.RuleContext,
  onReport: (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void,
): Rule.RuleContext {
  const overriddenReportContext = {
    report(reportDescriptor: Rule.ReportDescriptor) {
      onReport(context, reportDescriptor);
    },
  };

  Object.setPrototypeOf(overriddenReportContext, context);

  return overriddenReportContext as Rule.RuleContext;
}

function messageChanger(messageChanger: (message: string) => string) {
  return (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => {
    const report = reportDescriptor as { message?: string };
    if (report.message) {
      report.message = messageChanger(report.message);
    }
    context.report(reportDescriptor);
  };
}

function urlRemover() {
  const urlRegexp = / \(https:[^)]+\)/;
  return (message: string) => message.replace(urlRegexp, '');
}
