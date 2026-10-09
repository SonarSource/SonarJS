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
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from './fixtures.mjs';

test('committed expectation rename reports the removed and added rules', async t => {
  const f = fixture(t);
  f.ctx.failed = false;
  f.result('baseline', 'S9876', 'removed.js', 2);
  f.git(['add', 'baseline']);
  f.git(['commit', '--amend', '--no-edit']);
  f.ctx.testedCommit = f.git(['rev-parse', 'HEAD']);
  assert.match(f.git(['diff', '--name-status', f.base, 'HEAD', '--', 'baseline']), /R100/);
  assert.equal(await f.bot().report(f.config), 'reported');
  const body = f.state.comments[0].body;
  assert.match(body, /Code no longer flagged[\s\S]*S2000[\s\S]*removed\.js:2/);
  assert.match(body, /New issues flagged[\s\S]*S9876[\s\S]*removed\.js:2/);
});
