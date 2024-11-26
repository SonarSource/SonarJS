/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6557/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

// Core implementation of this rule does not provide a message for quick fixes. Normally, we would
// just map the rule id to a message in src/linter/quickfixes/messages.ts. However,
// here we need a different message per method, that is, String#startsWith and String#endsWith.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    (context, descriptor) => {
      /**
       * Because TypeScript ESLint's rule provides a different message id for the
       * methods String#startsWith and String#endsWith, we reuse that very same
       * identifier as the message id of the fix transformed into a suggestion.
       */
      const { fix, messageId } = descriptor as { fix: Rule.ReportFixer; messageId: string };
      const suggest: Rule.SuggestionReportDescriptor[] = [
        {
          messageId,
          fix,
        },
      ];
      delete descriptor['fix'];
      context.report({ ...descriptor, suggest });
    },
  );
}
