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
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const generator = new URL('../../../tools/external-rules-metadata.js', import.meta.url);

function generateMetadata(
  docs: { description: string; url?: string } | undefined,
  importVersion = '2.32.0',
) {
  const output = new Map<string, { key: string; description: string }[]>();
  vm.runInNewContext(readFileSync(generator, 'utf8'), {
    __dirname: path.dirname(generator.pathname),
    console: { log() {} },
    require(name: string) {
      if (name === 'fs') {
        return {
          writeFileSync(filename: string, contents: string) {
            output.set(path.basename(filename), JSON.parse(contents));
          },
        };
      }
      if (name === 'path') {
        return path;
      }
      if (name === 'eslint-plugin-import/package.json') {
        return { version: importVersion };
      }
      if (name === 'eslint') {
        return {
          Linter: class {
            getRules() {
              return new Map();
            }
          },
        };
      }
      return { rules: { 'no-import-module-exports': { meta: { docs, type: 'problem' } } } };
    },
  });
  return output;
}

describe('external ESLint rule metadata', () => {
  it('preserves the documentation URL provided by the rule', () => {
    const output = generateMetadata({ description: 'Example', url: 'https://example.com/rule' });
    assert.match(output.get('import.json')![0].description, /href="https:\/\/example\.com\/rule"/);
  });

  it('links import rules to their documentation when the URL is missing', () => {
    const output = generateMetadata({ description: 'Forbid imports with module.exports' });
    const actual = output.get('import.json')![0];
    const resource = new URL(
      '../../../sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/eslint/import.json',
      import.meta.url,
    );
    const checkedIn = JSON.parse(readFileSync(resource, 'utf8')).find(
      (rule: { key: string }) => rule.key === actual.key,
    );
    assert.ok(
      actual.description.includes(
        'href="https://github.com/import-js/eslint-plugin-import/blob/v2.32.0/docs/rules/no-import-module-exports.md"',
      ),
    );
    assert.equal(actual.description, checkedIn.description);
  });

  it('uses the installed import plugin version in fallback URLs', () => {
    const output = generateMetadata(undefined, '9.8.7');
    assert.ok(
      output
        .get('import.json')![0]
        .description.includes('/blob/v9.8.7/docs/rules/no-import-module-exports.md'),
    );
  });

  it('links other plugins to their package when documentation metadata is absent', () => {
    const output = generateMetadata(undefined);
    assert.ok(
      output
        .get('react.json')![0]
        .description.includes('href="https://www.npmjs.com/package/eslint-plugin-react"'),
    );
    for (const rules of output.values()) {
      for (const rule of rules) {
        assert.ok(!rule.description.includes('href="undefined"'));
      }
    }
  });
});
