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
// https://sonarsource.github.io/rspec/#/rspec/S8961/javascript

import type { Rule } from 'eslint';
import { generateMeta } from '../helpers/generate-meta.js';
import { isVue2OrEarlier } from '../helpers/vue.js';
import * as meta from './generated-meta.js';

/** Decorates vue/require-explicit-emits to silence it on Vue 2 projects: the `emits` option it expects is a Vue 3 feature, unrelated to the Composition API despite reusing S9145/S9150's Vue 3 gate. */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    meta: generateMeta(meta, rule.meta),
    create(context: Rule.RuleContext) {
      if (isVue2OrEarlier(context)) {
        return {};
      }
      return rule.create(context);
    },
  };
}
