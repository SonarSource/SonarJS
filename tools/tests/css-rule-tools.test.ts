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
import { describe, it, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import stylelint from 'stylelint';
import type { CssRuleDefinition } from '../../packages/analysis/src/css/rules/types.js';
import { createNewCssRule } from '../create-css-rule-boilerplate.js';
import {
  getCssRulesMetadata,
  updateCssRuleIndexes,
  validateCssRulesMetadata,
} from '../generate-css-rule-indexes.js';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const original = (stylelintKey = 'sonar/example'): CssRuleDefinition => ({
  implementation: 'original',
  bindings: [{ stylelintKey }],
});

async function fixture(t: TestContext) {
  const target = join(repositoryRoot, 'target');
  await mkdir(target, { recursive: true });
  // Stay under the repository so scaffolded plugins can resolve installed packages.
  const folder = await mkdtemp(join(target, 'css-rule-tools-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
}

async function loadPlugin(folder: string, sonarKey: string) {
  return (await import(pathToFileURL(join(folder, sonarKey, 'index.ts')).href)).rule;
}

async function lint(plugin: { ruleName: string; rule: stylelint.Rule }, code: string) {
  const {
    results: [{ warnings }],
  } = await stylelint.lint({
    code,
    codeFilename: 'test.css',
    config: { plugins: [plugin], rules: { [plugin.ruleName]: true } },
  });
  return warnings;
}

describe('CSS rule scaffolding and generation', () => {
  it('creates and registers an original plugin with working reports', async t => {
    const folder = await fixture(t);
    await createNewCssRule('S100', original(), folder);
    const plugin = await loadPlugin(folder, 'S100');
    assert.equal(plugin.ruleName, 'sonar/example');
    assert.deepEqual(await lint(plugin, 'a { color: red; }'), []);
    const warnings = await lint(plugin, 'a { invalid-property: red; }');
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].rule, 'sonar/example');
    assert.equal(warnings[0].column, 5);
    assert.match(await readFile(join(folder, 'S100/unit.test.ts'), 'utf8'), /StylelintRuleTester/);
    assert.match(await readFile(join(folder, 'rules.ts'), 'utf8'), /rule as S100/);
    await assert.rejects(
      createNewCssRule('S100', original('sonar/other'), folder),
      /duplicate CSS rule key/,
    );
    assert.equal((await loadPlugin(folder, 'S100')).ruleName, 'sonar/example');
  });

  it('scaffolds a decorator using the existing isolated-report helper', async t => {
    const folder = await fixture(t);
    await cp(
      join(repositoryRoot, 'packages/analysis/src/css/rules/helpers/decorated-result.ts'),
      join(folder, 'helpers/decorated-result.ts'),
      { recursive: true },
    );
    await createNewCssRule(
      'S101',
      {
        implementation: 'decorated',
        bindings: [
          {
            stylelintKey: 'sonar/example-important',
            upstreamRule: 'declaration-no-important',
            cssOnly: true,
          },
        ],
      },
      folder,
    );
    const plugin = await loadPlugin(folder, 'S101');
    assert.deepEqual(await lint(plugin, 'a { color: red; }'), []);
    const warnings = await lint(plugin, 'a { color: red !important; }');
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].rule, 'sonar/example-important');
    assert.match(warnings[0].text, /Replace this declaration/);
  });

  it('keeps external multi-bindings in metadata without creating a plugin wrapper', async t => {
    const folder = await fixture(t);
    const meta: CssRuleDefinition = {
      implementation: 'external',
      externalPlugin: 'stylelint',
      bindings: [
        { stylelintKey: 'selector-no-deprecated' },
        { stylelintKey: 'at-rule-no-deprecated' },
      ],
    };
    await createNewCssRule('S1874', meta, folder);
    assert.deepEqual(await getCssRulesMetadata(folder), [{ sonarKey: 'S1874', meta }]);
    await assert.rejects(readFile(join(folder, 'S1874/rule.ts')), { code: 'ENOENT' });
    await assert.rejects(readFile(join(folder, 'S1874/index.ts')), { code: 'ENOENT' });
    assert.doesNotMatch(await readFile(join(folder, 'rules.ts'), 'utf8'), /rule as S1874/);
    assert.match(await readFile(join(folder, 'metas.ts'), 'utf8'), /meta as S1874/);
  });

  it('generates numeric, stable static exports without evaluating implementations', async t => {
    const folder = await fixture(t);
    await createNewCssRule('S100', original('sonar/later'), folder);
    await createNewCssRule('S20', original('sonar/earlier'), folder);
    // Generation must read metadata only, even if an implementation cannot be loaded.
    await writeFile(join(folder, 'S20/index.ts'), 'throw new Error("must not load");');
    await updateCssRuleIndexes(folder);
    const first = await readFile(join(folder, 'rules.ts'), 'utf8');
    assert.ok(first.indexOf('rule as S20') < first.indexOf('rule as S100'));
    const firstMeta = await readFile(join(folder, 'metas.ts'), 'utf8');
    await updateCssRuleIndexes(folder);
    assert.equal(await readFile(join(folder, 'rules.ts'), 'utf8'), first);
    assert.equal(await readFile(join(folder, 'metas.ts'), 'utf8'), firstMeta);
  });

  it('rejects a missing implementation before writing indexes', async t => {
    const folder = await fixture(t);
    await mkdir(join(folder, 'S100'));
    await writeFile(
      join(folder, 'S100/meta.ts'),
      `export const meta = ${JSON.stringify(original())};`,
    );
    await assert.rejects(updateCssRuleIndexes(folder), { code: 'ENOENT' });
    await assert.rejects(readFile(join(folder, 'rules.ts')), { code: 'ENOENT' });
  });

  it('validates before creating a new rule folder', async t => {
    const folder = await fixture(t);
    await assert.rejects(
      createNewCssRule('../outside', original(), folder),
      /Invalid or duplicate CSS rule key/,
    );
    await assert.rejects(
      createNewCssRule('S100', original('not-namespaced'), folder),
      /must start with/,
    );
    await assert.rejects(readFile(join(folder, 'S100/meta.ts')), { code: 'ENOENT' });
  });
});

describe('CSS rule metadata validation', () => {
  it('rejects duplicate bindings across Sonar rules', () => {
    assert.throws(
      () =>
        validateCssRulesMetadata([
          { sonarKey: 'S100', meta: original() },
          { sonarKey: 'S101', meta: original() },
        ]),
      /Duplicate CSS Stylelint key/,
    );
  });

  it('validates upstream providers and decorated rule names', () => {
    assert.doesNotThrow(() =>
      validateCssRulesMetadata([
        {
          sonarKey: 'S1116',
          meta: {
            implementation: 'external',
            externalPlugin: '@stylistic/stylelint-plugin',
            bindings: [{ stylelintKey: '@stylistic/no-extra-semicolons' }],
          },
        },
      ]),
    );
    assert.throws(
      () =>
        validateCssRulesMetadata([
          {
            sonarKey: 'S100',
            meta: {
              implementation: 'external',
              externalPlugin: 'stylelint',
              bindings: [{ stylelintKey: '@stylistic/no-extra-semicolons' }],
            },
          },
        ]),
      /unknown external rule/,
    );
    assert.throws(
      () =>
        validateCssRulesMetadata([
          {
            sonarKey: 'S100',
            meta: {
              implementation: 'decorated',
              bindings: [
                { stylelintKey: 'sonar/example', upstreamRule: 'does-not-exist' as never },
              ],
            },
          },
        ]),
      /unknown upstream rule/,
    );
  });

  it('rejects parameter conflicts across bindings of one Sonar rule', () => {
    const parameter = {
      sqKey: 'ignore',
      javaField: 'ignored',
      description: 'Items to ignore.',
      default: '',
      stylelintOptionKey: 'ignoreAtRules',
    };
    assert.throws(
      () =>
        validateCssRulesMetadata([
          {
            sonarKey: 'S1874',
            meta: {
              implementation: 'external',
              externalPlugin: 'stylelint',
              bindings: [
                { stylelintKey: 'at-rule-no-deprecated', listParam: [parameter] },
                { stylelintKey: 'at-rule-no-unknown', listParam: [parameter] },
              ],
            },
          },
        ]),
      /duplicate parameter or Java field/,
    );
  });

  it('reserves S2260 for the existing parsing-error integration', () => {
    assert.throws(
      () => validateCssRulesMetadata([{ sonarKey: 'S2260', meta: original() }]),
      /reserved for parsing errors/,
    );
  });
});
