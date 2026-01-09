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
// https://sonarsource.github.io/rspec/#/rspec/S7785/javascript

import type { Rule } from 'eslint';
import { generateMeta, isESModule } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/prefer-top-level-await rule to skip CommonJS files.
 *
 * Top-level await is only available in ES modules, not CommonJS.
 * Flagging CJS files for not using top-level await is a false positive
 * since they can't use it anyway.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, rule.meta),

    create(context: Rule.RuleContext) {
      if (!isESModule(context)) {
        return {};
      }
      return rule.create(context);
    },
  };
}
