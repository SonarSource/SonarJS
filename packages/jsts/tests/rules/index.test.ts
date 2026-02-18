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
import { configs, meta } from '../../src/rules/plugin.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { valid } from 'semver';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { pathToFileURL } from 'node:url';

import { rules as a11yRules } from '../../src/rules/external/a11y.js';
import { rules as reactRules } from '../../src/rules/external/react.js';
import { getESLintCoreRule } from '../../src/rules/external/core.js';
import { rules as tsEslintRules } from '../../src/rules/external/typescript-eslint/index.js';
import { rules as importRules } from 'eslint-plugin-import';
import reactHooksRules from 'eslint-plugin-react-hooks';
import angularPlugin from '@angular-eslint/eslint-plugin';
const { rules: angularRules } = angularPlugin;
import { rules as unicornRules } from '../../src/rules/external/unicorn.js';
import { SonarMeta } from '../../src/rules/helpers/index.js';

const allExternalRules = {
  eslint: key => getESLintCoreRule(key),
  'typescript-eslint': key => tsEslintRules[key],
  'jsx-a11y': key => a11yRules[key],
  import: key => importRules[key],
  react: key => reactRules[key],
  'react-hooks': key => (reactHooksRules as any).rules[key],
  '@stylistic/eslint-plugin': async key => await import(`@stylistic/eslint-plugin/rules/${key}`),
  '@angular-eslint': key => angularRules[key],
  unicorn: key => unicornRules[key],
};
const externalPlugins = Object.keys(allExternalRules);

describe('Plugin public API', () => {
  it('should map keys to rules definitions', async () => {
    const ruleFolder = path.join(import.meta.dirname, '../../src/rules');
    const ruleIds = (await readdir(ruleFolder)).filter(name => /^S\d+/.test(name));
    const usedExternalEslintIds: string[] = [];
    // S1537 (comma-dangle, disallows trailing commas) and S3723 (enforce-trailing-comma,
    // enforces trailing commas) both wrap @stylistic/eslint-plugin:comma-dangle but with
    // opposite configurations, so the same external rule is intentionally used twice.
    const allowedDuplicateExternalRules = new Set(['@stylistic/eslint-plugin:comma-dangle']);

    for (const ruleId of ruleIds) {
      const metadata = (await import(
        pathToFileURL(path.join(ruleFolder, ruleId, 'generated-meta.js')).toString()
      )) as SonarMeta;
      expect(metadata.eslintId).toBeDefined();
      expect(metadata.sonarKey).toEqual(ruleId);
      expect(['original', 'decorated', 'external']).toContain(metadata.implementation);
      if (metadata.implementation === 'original') {
        const { rule } = await import(
          pathToFileURL(path.join(ruleFolder, metadata.sonarKey, 'index.js')).toString()
        );
        expect(rule.meta.docs!.url).toBe(
          `https://sonarsource.github.io/rspec/#/rspec/${metadata.sonarKey}/javascript`,
        );
        if (metadata.meta.docs?.recommended) {
          expect(configs.recommended.rules).toHaveProperty(`sonarjs/${metadata.eslintId}`);
          expect(configs.recommended.rules![`sonarjs/${metadata.eslintId}`]).toEqual('error');
        } else {
          expect(configs.recommended.rules![`sonarjs/${metadata.eslintId}`]).toEqual('off');
        }
        expect(configs.recommended.plugins!['sonarjs'].rules).toHaveProperty(metadata.eslintId);
      } else if (metadata.implementation === 'external') {
        expect(externalPlugins).toContain(metadata.externalPlugin);
        const externalKey = `${metadata.externalPlugin}:${metadata.eslintId}`;
        if (!allowedDuplicateExternalRules.has(externalKey)) {
          expect(usedExternalEslintIds).not.toContain(externalKey);
        }
        expect(await allExternalRules[metadata.externalPlugin!](metadata.eslintId)).toBeDefined();
        usedExternalEslintIds.push(externalKey);
      } else if (metadata.implementation === 'decorated') {
        expect(metadata.externalRules!.length).toBeGreaterThan(0);
        for (const externalRule of metadata.externalRules!) {
          const externalKey = `${externalRule.externalPlugin}:${externalRule.externalRule}`;
          if (!allowedDuplicateExternalRules.has(externalKey)) {
            expect(usedExternalEslintIds).not.toContain(externalKey);
          }
          usedExternalEslintIds.push(externalKey);
          expect(externalPlugins).toContain(externalRule.externalPlugin);
          expect(
            await allExternalRules[externalRule.externalPlugin](externalRule.externalRule),
          ).toBeDefined();
        }
      }
    }
  });

  it('should export legacy config', () => {
    const legacyConfig = configs['recommended-legacy'];
    expect(legacyConfig.plugins).toEqual(['sonarjs']);
    expect(legacyConfig.rules).toEqual(configs.recommended.rules);
    expect(legacyConfig.settings).toEqual(configs.recommended.settings);
  });

  it('should export meta', () => {
    expect(meta.name).toEqual('eslint-plugin-sonarjs');
    expect(valid(meta.version)).toBeTruthy();
  });
});
