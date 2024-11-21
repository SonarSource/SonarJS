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
import { basename, dirname } from 'path';
import { check } from '../../../../tests/tools/index.js';
import { rule } from '../rule.js';
import { describe } from 'node:test';
import { join } from 'node:path';

const _dirname = join(import.meta.dirname, 'fixtures');
process.chdir(_dirname); // change current working dir to avoid the package.json lookup to up in the tree
const sonarId = basename(dirname(import.meta.dirname));

describe('Rule S1607', () => {
  check(sonarId, rule, import.meta.dirname);
});
