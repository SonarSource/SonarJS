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
// https://sonarsource.github.io/rspec/#/rspec/S3723/javascript

import { getESLintCoreRule } from '../external/core.js';
import { generateMeta } from '../helpers/index.js';
import * as meta from './meta.js';

/**
 * S1537 ('comma-dangle') and S3723 ('enforce-trailing-comma') both depend on the
 * same ESLint implementation, but the plugin doesn't allow rule key duplicates.
 */
export const rule = {
  ...getESLintCoreRule('comma-dangle'),
  meta: generateMeta(meta, getESLintCoreRule('comma-dangle').meta),
};
