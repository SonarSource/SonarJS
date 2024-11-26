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
import { compareSync } from 'dir-compare';
import { setupBeforeAll, testProject } from '../tools/testProject.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Ruling', () => {
  const { project, expectedPath, actualPath, rules } = setupBeforeAll(import.meta.filename);
  it(project.name, { timeout: 10 * 60 * 1000 }, async () => {
    await testProject(project, actualPath, rules);
    assert(
      compareSync(expectedPath, actualPath, {
        compareContent: true,
      }).same,
    );
  });
});
