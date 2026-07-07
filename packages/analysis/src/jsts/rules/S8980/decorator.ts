/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S8980/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

// Reported by the upstream rule for `act(() => {})`; already covered by S1186.
const EMPTY_CALLBACK_MESSAGE_ID = 'noUnnecessaryActEmptyFunction';

// Without any `testing-library/*` settings, the upstream rule falls back to
// "aggressive" name-based heuristics: it treats any call merely *named* like
// `render`/`getBy*`/`fireEvent` as a Testing Library util, regardless of where
// it's imported from. Forcing these settings switches it to precise,
// import-resolution-only detection instead. The official `@testing-library/*`
// module check still runs unconditionally, so real Testing Library imports are
// unaffected; only the name-based fallback for anything else is disabled.
const STRICT_IMPORT_RESOLUTION_SETTINGS = {
  'testing-library/utils-module': 'sonarjs-s8980',
  'testing-library/custom-renders': 'off',
  'testing-library/custom-queries': 'off',
};

function withStrictImportResolution(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    create(context: Rule.RuleContext) {
      const overriddenContext = Object.create(context, {
        settings: {
          value: { ...context.settings, ...STRICT_IMPORT_RESOLUTION_SETTINGS },
          enumerable: true,
        },
      });
      return rule.create(overriddenContext);
    },
  };
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...withStrictImportResolution(rule),
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (
        'messageId' in reportDescriptor &&
        reportDescriptor.messageId === EMPTY_CALLBACK_MESSAGE_ID
      ) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}
