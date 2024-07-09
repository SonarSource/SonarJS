/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S6957/javascript

import { Rule } from 'eslint';
import { rules } from 'eslint-plugin-react';
import { generateMeta } from '../helpers/generate-meta';
import { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import { FromSchema } from 'json-schema-to-ts';
import rspecMeta from './meta.json';
import { getNearestPackageJsons } from '../helpers/package-json';

const reactNoDeprecated = rules['no-deprecated'];

const messages = {
  deprecated: '{{oldMethod}} is deprecated since React {{version}}{{newMethod}}',
};

const schema = {
  type: 'array',
  minItems: 0,
  maxItems: 1,
  items: [
    {
      type: 'object',
      properties: {
        'react-version': {
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  ],
} as const satisfies JSONSchema4;

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, { messages, schema }),
  create(context: Rule.RuleContext) {
    function getVersionFromOptions() {
      return (context.options as FromSchema<typeof schema>)[0]?.['react-version'];
    }
    function getVersionFromPackageJson() {
      for (const { contents: packageJson } of getNearestPackageJsons(context.filename)) {
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
