/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { generateMeta } from '../helpers/index.js';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';
import { getReactVersion } from '../helpers/package-jsons/dependencies.js';

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

    const reactVersion = getVersionFromOptions() || getReactVersion(context);

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
