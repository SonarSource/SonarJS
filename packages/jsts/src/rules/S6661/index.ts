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
import type { Rule } from 'eslint';
import { getESLintCoreRule } from '../external/core.js';
import { decorate } from './decorator.js';
import { dirname } from 'node:path/posix';
import { toUnixPath, isSupported } from '../helpers/index.js';

const decorated = decorate(getESLintCoreRule('prefer-object-spread'));

export const rule: Rule.RuleModule = {
  meta: decorated.meta,
  create(context) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#browser_compatibility
    if (!isSupported(dirname(toUnixPath(context.filename)), { node: '8.3.0' })) {
      return {};
    }

    return decorated.create(context);
  },
};
