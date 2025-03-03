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
// https://sonarsource.github.io/rspec/#/rspec/S2092/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { CookieFlagCheck } from '../helpers/cookie-flag-check.js';
import { generateMeta } from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, undefined),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) =>
        new CookieFlagCheck(context, 'secure').checkCookiesFromCallExpression(node),
    };
  },
};
