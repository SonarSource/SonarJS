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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { fixture } from './fixtures.mjs';

function report(f, base, overrides = {}) {
  return execFileSync(
    process.execPath,
    [fileURLToPath(new URL('../generate-report.mjs', import.meta.url)), 'display-results'],
    {
      cwd: f.workspace,
      encoding: 'utf8',
      env: {
        ...process.env,
        RULING_REPOSITORY_PATH: f.workspace,
        BASE_SHA: base,
        SOURCES_PATH: 'sources',
        SOURCES_REPO_URL: 'https://example.test/sources/blob/main',
        RSPEC_BASE_URL: 'https://example.test/rules',
        MAX_INLINE_SNIPPETS: '10',
        ...overrides,
      },
    },
  );
}

test('CSS custom fixtures and project TSX sources keep snippets, highlighting and language-specific rule links', t => {
  const f = fixture(t);
  const base = f.merge;
  f.write('display-results/custom-css/css-S100.json', {
    'custom-css:style with space.css': [3],
  });
  f.write(
    'sources/custom/css/style with space.css',
    'before\n.selector {\n  color: red;\n}\nafter\n',
  );
  f.write('display-results/sample/typescript-S200.json', { 'sample:component.tsx': [2] });
  f.write('sources/projects/sample/component.tsx', 'before\nconst element = <div />;\nafter\n');

  const body = report(f, base);
  assert.match(body, /New issues flagged \(2 issues\)/);
  assert.match(body, /```css\n[\s\S]*>\s+3 \|   color: red;/);
  assert.match(body, /```tsx\n[\s\S]*>\s+2 \| const element = <div \/>;/);
  assert.match(body, /href="https:\/\/example.test\/rules\/S100\/css"/);
  assert.match(body, /href="https:\/\/example.test\/rules\/S200\/typescript"/);
  assert.match(
    body,
    /href="https:\/\/example.test\/sources\/blob\/main\/sample\/component.tsx#L2"/,
  );
  assert.match(body, /custom-css\/style%20with%20space.css#L3/);
  assert.doesNotMatch(body, /snippet not available|<details>/);
});

test('snippet limits apply independently to additions and removals while the collapsed report lists every change', t => {
  const f = fixture(t);
  f.write('display-results/sample/javascript-S100.json', {
    'sample:file.js': Array.from({ length: 12 }, (_, index) => index + 1),
  });
  f.write(
    'sources/projects/sample/file.js',
    Array.from({ length: 30 }, (_, index) => `source ${index + 1}`).join('\n'),
  );
  const base = f.commit('Existing issue locations');
  f.write('display-results/sample/javascript-S100.json', {
    'sample:file.js': Array.from({ length: 14 }, (_, index) => index + 13),
  });

  const body = report(f, base, { MAX_INLINE_SNIPPETS: '2' });
  const [inline, collapsed] = body.split('<details>');
  assert.match(inline, /Code no longer flagged \(12 issues\)/);
  assert.match(inline, /New issues flagged \(14 issues\)/);
  assert.equal(inline.match(/^```javascript$/gm).length, 4);
  assert.match(inline, /and 10 more/);
  assert.match(inline, /and 12 more/);
  assert.match(collapsed, /View full report/);
  assert.equal(collapsed.match(/^- <a href=/gm).length, 26);
  assert.match(collapsed, />sample\/file.js:1<\/a>/);
  assert.match(collapsed, />sample\/file.js:26<\/a>/);
  assert.match(collapsed, /<\/details>/);
});

test('empty source and rule URLs disable links while retaining local snippets', t => {
  const f = fixture(t);
  const base = f.merge;
  f.write('display-results/sample/javascript-S100.json', { 'sample:file.js': [2] });
  f.write('sources/projects/sample/file.js', 'before\nreported source\nafter\n');

  const body = report(f, base, { SOURCES_REPO_URL: '', RSPEC_BASE_URL: '' });
  assert.match(body, /#### S100/);
  assert.match(body, /\*\*sample\/file.js:2\*\*/);
  assert.match(body, /```javascript\n[\s\S]*>\s+2 \| reported source/);
  assert.doesNotMatch(body, /href=/);
});

test('an empty source path disables snippets while retaining locations and source links', t => {
  const f = fixture(t);
  const base = f.merge;
  f.write('display-results/sample/javascript-S100.json', { 'sample:file.js': [2] });
  f.write('sources/projects/sample/file.js', 'before\nreported source\nafter\n');

  const body = report(f, base, { SOURCES_PATH: '' });
  assert.match(body, /sample\/file.js#L2/);
  assert.match(body, /sample\/file.js:2/);
  assert.match(body, /snippet not available/);
  assert.doesNotMatch(body, /```|reported source/);
});
