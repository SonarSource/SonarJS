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
// https://sonarsource.github.io/rspec/#/rspec/S9115/javascript

import type { Rule } from 'eslint';
import { gte, validRange } from 'semver';
import { generateMeta } from '../helpers/generate-meta.js';
import { getDependenciesSanitizePaths } from '../helpers/dependency-manifests/dependencies.js';
import { getProjectMinVersion } from '../helpers/validate-version.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

const USER_EVENT_MODULE = '@testing-library/user-event';
const USER_EVENT_MINIMUM_VERSION = '14.0.0';

const messages = {
  awaitAsyncEvent:
    'Handle the promise returned by async event method `{{ name }}` so the test waits for the interaction to finish.',
  awaitAsyncEventWrapper:
    'Handle the promise returned by `{{ name }}` so callers wait for the wrapped interaction to finish.',
};

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  const upstreamRule = withUserEventOnly(withStrictImportResolution(rule));
  const decoratedRule = {
    ...upstreamRule,
    meta: generateMeta(meta, {
      ...(rule.meta ?? {}),
      messages: {
        ...(rule.meta?.messages ?? {}),
        ...messages,
      },
    }),
  };

  return {
    ...decoratedRule,
    create(context: Rule.RuleContext): Rule.RuleListener {
      const dependencies = getDependenciesSanitizePaths(context);
      const versionRange = dependencies.get(USER_EVENT_MODULE);
      if (!supportsUserEvent(versionRange)) {
        return {};
      }
      return decoratedRule.create(context);
    },
  };
}

function withUserEventOnly(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    create(context: Rule.RuleContext): Rule.RuleListener {
      const overriddenContext = Object.create(context, {
        options: {
          value: [{ eventModule: 'userEvent' }],
          enumerable: true,
        },
      }) as Rule.RuleContext;
      return rule.create(overriddenContext);
    },
  };
}

function supportsUserEvent(versionRange: string | undefined): boolean {
  if (versionRange === undefined) {
    return false;
  }

  const normalizedVersionRange = versionRange.trim();
  if (
    isUnboundedVersionRange(normalizedVersionRange) ||
    validRange(normalizedVersionRange) === null
  ) {
    return false;
  }

  const minimumVersion = getProjectMinVersion(normalizedVersionRange);
  return minimumVersion !== null && gte(minimumVersion, USER_EVENT_MINIMUM_VERSION);
}

function isUnboundedVersionRange(versionRange: string): boolean {
  return (
    versionRange === '' ||
    versionRange === '*' ||
    ['latest', 'x'].includes(versionRange.toLowerCase())
  );
}
