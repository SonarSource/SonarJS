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
import { parse as parseSemver } from 'semver';
import { generateMeta } from '../helpers/generate-meta.js';
import { getVueVersion } from '../helpers/dependency-manifests/dependencies.js';
import * as meta from './generated-meta.js';

const VUE_3_MAJOR_VERSION = 3;

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
 * Returns true when the project's Vue dependency is 2 or earlier.
 *
 * @param context the rule context
 * @return whether the project is on Vue 2 or earlier
 */
function isVue2OrEarlier(context: Rule.RuleContext): boolean {
  const vueVersion = getVueVersion(context);
  if (!vueVersion) {
    return false;
  }
  const version = parseSemver(vueVersion);
  return version !== null && version.major < VUE_3_MAJOR_VERSION;
}
