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
// https://sonarsource.github.io/rspec/#/rspec/S1874/javascript

import { Rule } from 'eslint';
import { isRequiredParserServices } from '../helpers';
import * as ts from 'typescript';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      deprecation: '{{deprecation}}',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      Program: () => {
        const program = services.program;
        const checker = program.getTypeChecker();
        const sourceFile = program.getSourceFile(context.filename);
        const diagnostics: ts.DiagnosticWithLocation[] =
          // @ts-ignore: TypeChecker#getSuggestionDiagnostics is not publicly exposed
          checker.getSuggestionDiagnostics(sourceFile);
        for (const diagnostic of diagnostics) {
          if (diagnostic.reportsDeprecated === true) {
            const sourceCode = context.sourceCode;
            const start = sourceCode.getLocFromIndex(diagnostic.start);
            const end = sourceCode.getLocFromIndex(diagnostic.start + diagnostic.length);
            const loc = { start, end };
            context.report({
              loc,
              messageId: 'deprecation',
              data: {
                deprecation: diagnostic.messageText as string,
              },
            });
          }
        }
      },
    };
  },
};
