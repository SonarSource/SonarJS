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
// https://sonarsource.github.io/rspec/#/rspec/S1438/javascript

import { Rule } from 'eslint';
import { interceptReport } from './helpers';

export function decorateSemi(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, fixLocation);
}

function fixLocation(context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) {
  const report = reportDescriptor as any;
  if (report.loc?.start && report.messageId === 'missingSemi') {
    report.loc = report.loc.start;
  }
  context.report(reportDescriptor);
}
