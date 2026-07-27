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
import { intersects, validRange } from 'semver';
import { generateMeta } from '../helpers/generate-meta.js';
import { getVueVersion } from '../helpers/dependency-manifests/dependencies.js';
import * as meta from './generated-meta.js';

const VUE_3_OR_LATER_RANGE = '>=3.0.0';

/**
 * Decorates the vue/require-explicit-emits rule to silence it on Vue 2 projects.
 *
 * The `emits` component option this rule expects components to declare is a
 * Vue 3 feature, so its fix is not actionable in Vue 2. When the Vue version
 * cannot be determined the rule still reports.
 */
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

/**
 * Returns true when the project's Vue dependency range cannot possibly resolve to Vue 3+.
 *
 * Ranges that could resolve to either Vue 2 and Vue 3 (e.g. ">=2.7.0", "^2.7.0 || ^3.0.0")
 * are treated as "Vue 3 is possible", so the rule keeps reporting. Unknown/unparseable
 * ranges (catalog:, workspace:, git:, missing dependency, ...) also keep reporting.
 *
 * @param context the rule context
 * @return whether the project's Vue range excludes Vue 3 entirely
 */
function isVue2OrEarlier(context: Rule.RuleContext): boolean {
  const vueVersionRange = getVueVersion(context);
  if (!vueVersionRange || !validRange(vueVersionRange)) {
    return false;
  }
  return !intersects(vueVersionRange, VUE_3_OR_LATER_RANGE);
}
