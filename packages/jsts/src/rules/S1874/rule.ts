/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1874/javascript

import type { Rule } from 'eslint';
import { generateMeta, isRequiredParserServices } from '../helpers/index.js';
import ts from 'typescript';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      deprecation: '{{deprecation}}',
    },
  }),
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
