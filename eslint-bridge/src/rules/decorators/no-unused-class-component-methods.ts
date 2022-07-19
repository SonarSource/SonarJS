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
import { interceptReport } from '../../utils';
import { BaseNode, ImportDeclaration } from 'estree';

export function decorateNoUnusedClassComponentMethod(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(rule, reportExempting(usesReact));
}

function reportExempting(
  raiseCondition: (context: Rule.RuleContext) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if (raiseCondition(context)) {
      context.report(reportDescriptor);
    }
  };
}


function usesReact(context: Rule.RuleContext): boolean {
  const program = context.getSourceCode().ast;
  if (program.sourceType === 'module') {
    for (const child of program.body as Array<BaseNode>) {
      if (child.type === 'ImportDeclaration' && (child as ImportDeclaration).source.value === 'react') {
        return true;
      }
    }
  }
  return false;
}
