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
// https://sonarsource.github.io/rspec/#/rspec/S8951/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

// Rewording the upstream message, which only describes the problem, into an actionable one.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, {
      ...rule.meta,
      messages: {
        ...rule.meta?.messages,
        unexpectedMutation:
          'Emit an event and register a listener for it in the parent, instead of mutating the "{{key}}" prop directly.',
      },
    }),
  };
}
