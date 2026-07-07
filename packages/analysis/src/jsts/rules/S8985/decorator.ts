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
// https://sonarsource.github.io/rspec/#/rspec/S8985/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

// Without any `testing-library/*` settings, the upstream rule falls back to
// "aggressive" name-based heuristics for `waitFor`, `fireEvent`, `userEvent`,
// and `render`: it treats any call merely *named* like one of these as a
// Testing Library util, regardless of where it's imported from. Forcing these
// settings (the upstream plugin's own documented recipe for disabling
// aggressive reporting) switches detection to import resolution instead. The
// official `@testing-library/*` module check still runs unconditionally, so
// real Testing Library imports are unaffected.
const STRICT_IMPORT_RESOLUTION_SETTINGS = {
  'testing-library/utils-module': 'off',
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
  return {
    ...withStrictImportResolution(rule),
    meta: generateMeta(meta, rule.meta),
  };
}
