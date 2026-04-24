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
import { configs, meta } from '../../../src/jsts/rules/plugin.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { valid } from 'semver';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { pathToFileURL } from 'node:url';

import {
  externalPlugins,
  getExternalRuleDefinition,
} from '../../../src/jsts/rules/external/registry.js';
import { SonarMeta } from '../../../src/jsts/rules/helpers/generate-meta.js';

describe('Plugin public API', () => {
  it('should map keys to rules definitions', async () => {
    const ruleFolder = path.join(import.meta.dirname, '../../../src/jsts/rules');
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
        expect(getExternalRuleDefinition(metadata.externalPlugin, metadata.eslintId)).toBeDefined();
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
            getExternalRuleDefinition(externalRule.externalPlugin, externalRule.externalRule),
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
