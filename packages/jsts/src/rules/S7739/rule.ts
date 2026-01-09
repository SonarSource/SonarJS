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
// https://sonarsource.github.io/rspec/#/rspec/S7739/javascript

import type { Rule } from 'eslint';
import { dirname } from 'node:path';
import { rules } from '../external/unicorn.js';
import { generateMeta } from '../helpers/index.js';
import { getDependencies } from '../helpers/package-jsons/dependencies.js';
import * as meta from './generated-meta.js';

const noThenable = rules['no-thenable'];

/**
 * Validation libraries like Yup and Joi intentionally define a `.then()` method
 * on their schema objects to allow chaining validations. This is a legitimate
 * use case that should not trigger the no-thenable rule.
 */
const VALIDATION_LIBRARIES = ['yup', 'joi'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, noThenable.meta),

  create(context: Rule.RuleContext) {
    const dependencies = getDependencies(dirname(context.filename), context.cwd);

    // Skip the rule if the project uses Yup or Joi validation libraries
    if (VALIDATION_LIBRARIES.some(lib => dependencies.has(lib))) {
      return {};
    }

    return noThenable.create(context);
  },
};
