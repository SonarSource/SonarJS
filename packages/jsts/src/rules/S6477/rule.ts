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
// https://sonarsource.github.io/rspec/#/rspec/S6477/javascript

import type { Rule } from 'eslint';
import pkg from 'eslint-plugin-react';
const { rules } = pkg;
import { generateMeta, getDependencies } from '../helpers/index.js';
import { decorate } from './decorator.js';
import { meta } from './meta.js';

const decoratedJsxKey = decorate(rules['jsx-key']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      ...decoratedJsxKey.meta!.messages,
    },
  }),
  create(context: Rule.RuleContext) {
    const dependencies = getDependencies(context.filename, context.cwd);
    if (!dependencies.has('react')) {
      return {};
    }
    return decoratedJsxKey.create(context);
  },
};
