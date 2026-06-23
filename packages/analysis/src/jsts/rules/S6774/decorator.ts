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
// https://sonarsource.github.io/rspec/#/rspec/S6774/javascript

import type { Rule } from 'eslint';
import { parse as parseSemver } from 'semver';
import { generateMeta } from '../helpers/generate-meta.js';
import { getReactVersion } from '../helpers/dependency-manifests/dependencies.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the react/prop-types rule to silence it on React 19+ projects.
 *
 * React 19 silently ignores `propTypes` on function components, so the
 * rule's prescribed fix is dead code there. When the React version cannot
 * be determined the rule still reports.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    meta: generateMeta(meta, rule.meta),
    create(context: Rule.RuleContext) {
      if (isReact19OrLater(context)) {
        return {};
      }
      return rule.create(context);
    },
  };
}

/**
 * Returns true when the project's React dependency is 19 or later.
 *
 * @param context the rule context
 * @return whether the project is on React 19+
 */
function isReact19OrLater(context: Rule.RuleContext): boolean {
  const reactVersion = getReactVersion(context);
  if (!reactVersion) {
    return false;
  }
  const version = parseSemver(reactVersion);
  return version !== null && version.major >= 19;
}
