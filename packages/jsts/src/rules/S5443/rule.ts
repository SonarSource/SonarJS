/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S5443/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

const UNIX_DIRECTORIES = [
  '/tmp/',
  '/var/tmp/',
  '/usr/tmp/',
  '/dev/shm/',
  '/dev/mqueue/',
  '/run/lock/',
  '/var/run/lock/',
  '/library/caches/',
  '/users/shared/',
  '/private/tmp/',
  '/private/var/tmp/',
].map(v => new RegExp(`^${v}`, 'i'));

const WINDOWS_DIRECTORIES_PATTERN = new RegExp(
  '^[^\\\\]*(\\\\){1,2}(Windows(\\\\){1,2}Temp|Temp|TMP)(\\\\.*|$)',
  'i',
);
const SENSITIVE_ENV_VARIABLES = ['TMPDIR', 'TMP', 'TEMPDIR', 'TEMP'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      safeDirectory: 'Make sure publicly writable directories are used safely here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        // Using literal.raw instead of literal.value as the latter escapes backslashes
        const value = literal.raw?.slice(1, literal.raw.length - 1);
        if (
          value &&
          (UNIX_DIRECTORIES.find(i => value.match(i)) || value.match(WINDOWS_DIRECTORIES_PATTERN))
        ) {
          context.report({
            node: literal,
            messageId: 'safeDirectory',
          });
        }
      },
      MemberExpression: (node: estree.Node) => {
        const memberExpression = node as estree.MemberExpression;
        const { object, property } = memberExpression;
        if (
          property.type !== 'Identifier' ||
          !SENSITIVE_ENV_VARIABLES.includes(property.name) ||
          object.type !== 'MemberExpression'
        ) {
          return;
        }
        if (
          object.property.type === 'Identifier' &&
          object.property.name === 'env' &&
          object.object.type === 'Identifier' &&
          object.object.name === 'process'
        ) {
          context.report({ node: memberExpression, messageId: 'safeDirectory' });
        }
      },
    };
  },
};
