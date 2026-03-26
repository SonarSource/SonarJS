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
// https://sonarsource.github.io/rspec/#/rspec/S6441/javascript

import type { Rule } from 'eslint';
import { rules } from '../external/react.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const noUnusedClassComponentMethod = rules['no-unused-class-component-methods'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    ...noUnusedClassComponentMethod.meta,
    messages: {
      unused:
        'Remove this property or method or refactor this component, as "{{name}}" is not used inside component body',
      unusedWithClass:
        'Remove this property or method or refactor "{{className}}", as "{{name}}" is not used inside component body',
    },
  }),
  create: noUnusedClassComponentMethod.create,
};
