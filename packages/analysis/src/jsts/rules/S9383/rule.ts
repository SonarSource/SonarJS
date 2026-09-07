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
// https://sonarsource.github.io/rspec/#/rspec/S9383/javascript

import type { Rule } from 'eslint';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

const noFloatingPromisesRule = tsEslintRules['no-floating-promises'];

/**
 * Upstream offers "add await"/"add void" suggestions for some messages. Quick fix
 * support isn't implemented yet (RSPEC quickfix is "unknown"), so suggestions are
 * stripped here rather than left dangling with no tested fix output.
 */
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { ...noFloatingPromisesRule.meta, hasSuggestions: false }),
  create(context: Rule.RuleContext) {
    return interceptReport(noFloatingPromisesRule, (ctx, descriptor) => {
      const { suggest: _suggest, ...rest } = descriptor as Rule.ReportDescriptor & {
        suggest?: unknown;
      };
      ctx.report(rest);
    }).create(context);
  },
};
