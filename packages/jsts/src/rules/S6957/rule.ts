/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6957/javascript

import type { Rule } from 'eslint';
import { rules } from '../external/react.js';
import { generateMeta, toUnixPath } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';
import { dirname } from 'path/posix';
import { getManifests } from '../helpers/package-jsons/all-in-parent-dirs.js';

const reactNoDeprecated = rules['no-deprecated'];

const messages = {
  deprecated: '{{oldMethod}} is deprecated since React {{version}}{{newMethod}}',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    function getVersionFromOptions() {
      return (context.options as FromSchema<typeof meta.schema>)[0]?.['react-version'];
    }
    function getVersionFromPackageJson() {
      for (const packageJson of getManifests(dirname(toUnixPath(context.filename)), context.cwd)) {
        if (packageJson.dependencies?.react) {
          return packageJson.dependencies.react;
        }
        if (packageJson.devDependencies?.react) {
          return packageJson.devDependencies.react;
        }
      }
      return null;
    }

    const reactVersion = getVersionFromOptions() || getVersionFromPackageJson();

    const patchedContext = reactVersion
      ? Object.create(context, {
          settings: {
            value: { react: { version: reactVersion } },
            writable: false,
          },
        })
      : context;
    return reactNoDeprecated.create(patchedContext);
  },
};
