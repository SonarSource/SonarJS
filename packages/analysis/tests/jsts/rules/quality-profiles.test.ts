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
import { describe, it } from 'node:test';
import {
  aggregateProfileRuleKeys,
  generateLanguageProfiles,
  isInSonarWay,
  profileNameToFileName,
} from '../../../src/jsts/rules/quality-profiles.js';

describe('generateLanguageProfiles', () => {
  it('applies array profiles to every compatible language', () => {
    const profiles = generateLanguageProfiles(
      [
        {
          ruleKey: 'S100',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: ['Sonar way'],
        },
        {
          ruleKey: 'S200',
          compatibleLanguages: ['ts'],
          defaultQualityProfiles: ['Sonar agentic AI'],
        },
      ],
      ['js', 'ts'],
    );

    assert.deepEqual(profiles, [
      { name: 'Sonar agentic AI', language: 'js', ruleKeys: [] },
      { name: 'Sonar agentic AI', language: 'ts', ruleKeys: ['S200'] },
      { name: 'Sonar way', language: 'js', ruleKeys: ['S100'] },
      { name: 'Sonar way', language: 'ts', ruleKeys: ['S100'] },
    ]);
  });

  it('excludes rules with an empty array profile from every language', () => {
    const profiles = generateLanguageProfiles(
      [
        {
          ruleKey: 'S100',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: [],
        },
        {
          ruleKey: 'S200',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: ['Sonar way'],
        },
      ],
      ['js', 'ts'],
    );

    assert.deepEqual(profiles, [
      { name: 'Sonar way', language: 'js', ruleKeys: ['S200'] },
      { name: 'Sonar way', language: 'ts', ruleKeys: ['S200'] },
    ]);
  });

  it('selects object profiles independently for each language', () => {
    const profiles = generateLanguageProfiles(
      [
        {
          ruleKey: 'S100',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: { js: [], ts: ['Sonar way', 'Sonar agentic AI'] },
        },
        {
          ruleKey: 'S200',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: { js: ['Sonar way'], ts: [] },
        },
      ],
      ['js', 'ts'],
    );

    assert.deepEqual(profiles, [
      { name: 'Sonar agentic AI', language: 'js', ruleKeys: [] },
      { name: 'Sonar agentic AI', language: 'ts', ruleKeys: ['S100'] },
      { name: 'Sonar way', language: 'js', ruleKeys: ['S200'] },
      { name: 'Sonar way', language: 'ts', ruleKeys: ['S100'] },
    ]);
  });
});

describe('profileNameToFileName', () => {
  it('includes the language when one is provided', () => {
    assert.equal(profileNameToFileName('Sonar way', 'js'), 'Sonar_way_js_profile.json');
  });

  it('uses the fallback name when the profile name contains no alphanumeric character', () => {
    assert.equal(profileNameToFileName('---', 'js'), 'Profile_js_profile.json');
  });

  it('keeps the shared profile filename when no language is provided', () => {
    assert.equal(profileNameToFileName('Sonar way'), 'Sonar_way_profile.json');
  });
});

describe('aggregateProfileRuleKeys', () => {
  it('returns the union of language-specific profile rule keys', () => {
    assert.deepEqual(
      aggregateProfileRuleKeys([{ ruleKeys: ['S100', 'S200'] }, { ruleKeys: ['S200', 'S300'] }]),
      new Set(['S100', 'S200', 'S300']),
    );
  });
});

describe('isInSonarWay', () => {
  it('treats a shared Sonar way array as recommended', () => {
    assert.equal(isInSonarWay(['Sonar way']), true);
  });

  it('treats an empty array as not recommended', () => {
    assert.equal(isInSonarWay([]), false);
  });

  it('treats a language map as recommended when any language includes Sonar way', () => {
    assert.equal(isInSonarWay({ js: [], ts: ['Sonar way'] }), true);
    assert.equal(isInSonarWay({ js: ['Sonar agentic AI'], ts: [] }), false);
  });
});
