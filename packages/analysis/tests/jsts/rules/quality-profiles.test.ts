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
  buildQualityProfileRuleKeys,
  isInSonarWay,
  SONAR_WAY,
} from '../../../src/jsts/rules/quality-profiles.js';

const sortRuleKeys = (left: string, right: string) => left.localeCompare(right);

describe('buildQualityProfileRuleKeys', () => {
  it('applies array profiles to every compatible language', () => {
    const profiles = buildQualityProfileRuleKeys(
      [
        {
          ruleKey: 'S100',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: [SONAR_WAY],
        },
        {
          ruleKey: 'S200',
          compatibleLanguages: ['js'],
          defaultQualityProfiles: [SONAR_WAY],
        },
      ],
      ['js', 'ts'],
      sortRuleKeys,
    );

    assert.deepEqual(
      profiles.get(SONAR_WAY),
      new Map([
        ['js', ['S100', 'S200']],
        ['ts', ['S100']],
      ]),
    );
  });

  it('excludes empty array memberships from every language', () => {
    const profiles = buildQualityProfileRuleKeys(
      [
        {
          ruleKey: 'S100',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: [],
        },
        {
          ruleKey: 'S200',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: [SONAR_WAY],
        },
      ],
      ['js', 'ts'],
      sortRuleKeys,
    );

    assert.deepEqual(
      profiles.get(SONAR_WAY),
      new Map([
        ['js', ['S200']],
        ['ts', ['S200']],
      ]),
    );
  });

  it('selects object profiles independently for each language', () => {
    const profiles = buildQualityProfileRuleKeys(
      [
        {
          ruleKey: 'S100',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: { js: [], ts: [SONAR_WAY] },
        },
        {
          ruleKey: 'S200',
          compatibleLanguages: ['js', 'ts'],
          defaultQualityProfiles: { js: [SONAR_WAY], ts: [] },
        },
      ],
      ['js', 'ts'],
      sortRuleKeys,
    );

    assert.deepEqual(
      profiles.get(SONAR_WAY),
      new Map([
        ['js', ['S200']],
        ['ts', ['S100']],
      ]),
    );
  });
});

describe('isInSonarWay', () => {
  it('accepts a language map when any language includes Sonar way', () => {
    assert.equal(isInSonarWay({ js: [], ts: [SONAR_WAY] }), true);
  });
});
