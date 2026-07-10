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
import type { Rule } from 'eslint';

// Without any `testing-library/*` settings, the upstream `eslint-plugin-testing-library`
// rules fall back to "aggressive" name-based heuristics for `waitFor`, `fireEvent`,
// `userEvent`, `render`, and custom queries: they treat any call merely *named* like one
// of these as a Testing Library util, regardless of where it's imported from. Forcing
// these settings (the upstream plugin's own documented recipe for disabling aggressive
// reporting) switches detection to import resolution instead. The official
// `@testing-library/*` module check still runs unconditionally, so real Testing Library
// imports are unaffected. Note this does not make *built-in* query detection
// (`getBy*`/`queryBy*`/`findBy*`) import-resolution-based: upstream matches those purely
// by name in all modes, so a same-named, unrelated helper (e.g. Playwright's
// `page.getByRole`) can still be misidentified as a Testing Library query. Accepted as a
// known v1 limitation inherited from the upstream plugin.
const STRICT_IMPORT_RESOLUTION_SETTINGS = {
  'testing-library/utils-module': 'off',
  'testing-library/custom-renders': 'off',
  'testing-library/custom-queries': 'off',
};

export function withStrictImportResolution(rule: Rule.RuleModule): Rule.RuleModule {
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
