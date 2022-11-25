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

export function decorateNoUnstableNestedComponents(rule: Rule.RuleModule): Rule.RuleModule {
  return changeReportMessage(rule, urlRemover());
}

// interceptReport() doesn't work with the React plugin as the rules fail to find the context getFirstTokens() function.
function changeReportMessage(rule: Rule.RuleModule, messageChanger: (message: string) => string) {
  return {
    // meta should be defined only when it's defined on original rule, otherwise RuleTester will fail
    ...(!!rule.meta && { meta: rule.meta }),
    create(context: Rule.RuleContext) {
      return rule.create(overrideContextReport(context, messageChanger));
    },
  };
}

function overrideContextReport(
  context: Rule.RuleContext,
  messageChanger: (message: string) => string,
): Rule.RuleContext {
  const overriddenReportContext = {
    report(reportDescriptor: Rule.ReportDescriptor) {
      context.report(changeMessage(reportDescriptor, messageChanger));
    },
  };

  Object.setPrototypeOf(overriddenReportContext, context);

  return overriddenReportContext as Rule.RuleContext;
}

function changeMessage(
  reportDescriptor: Rule.ReportDescriptor,
  messageChanger: (message: string) => string,
) {
  const report = reportDescriptor as { message?: string };
  if (report.message) {
    report.message = messageChanger(report.message);
  }
  return reportDescriptor;
}

function urlRemover() {
  const urlRegexp = / \(https:[^)]+\)/;
  return (message: string) => message.replace(urlRegexp, '');
}
