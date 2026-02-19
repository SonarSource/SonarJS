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
// https://sonarsource.github.io/rspec/#/rspec/S3723/javascript

import stylistic from '@stylistic/eslint-plugin';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * S1537 ('comma-dangle') and S3723 ('enforce-trailing-comma') both wrap
 * @stylistic/eslint-plugin's comma-dangle but with opposite defaults:
 * S1537 disallows trailing commas, S3723 enforces them.
 */
const commaDangle = stylistic.rules['comma-dangle'];

export const rule = {
  ...commaDangle,
  meta: generateMeta(meta, commaDangle.meta),
};
