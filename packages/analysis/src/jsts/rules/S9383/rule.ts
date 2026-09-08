/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S9383/javascript

import type { Rule } from 'eslint';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const noFloatingPromisesRule = tsEslintRules['no-floating-promises'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { ...noFloatingPromisesRule.meta }),
  create(context: Rule.RuleContext) {
    return noFloatingPromisesRule.create(context);
  },
};
