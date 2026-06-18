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
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolvePathUnder } from './common.js';

describe('resolvePathUnder', () => {
  it('resolves relative paths under the allowed root', () => {
    assert.equal(resolvePathUnder('/repo', 'build/out.json', 'output'), '/repo/build/out.json');
  });

  it('rejects paths outside the allowed root', () => {
    assert.throws(() => resolvePathUnder('/repo', '../out.json', 'output'), /output escapes/);
  });
});
