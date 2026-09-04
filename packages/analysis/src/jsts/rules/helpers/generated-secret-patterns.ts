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

// Generated from @sonarsource/analyzer-commons-configurations's secret-patterns.json. Do not edit manually.

export type PatternGroup = { category: string; patterns: string[] };
export type ExactMatchGroup = { category: string; values: string[] };

export const patternGroups: PatternGroup[] = [
  {
    category: 'FAKE_VALUE',
    patterns: [
      '^.{0,5}$',
      'sample|example|placeholder|replace|change|foo|bar|test|fake|abcd',
      'redacted|cafebabe|deadbeef|whatever|123456|admin|pass|secret|default|dummy|qwerty|setting|obfuscated',
      '^(my)?pass(word|wd)?\\d{0,5}$',
      'p[@a]ssw[o0]rd',
      '^(?:none|undefined|null|true|false|yes|no|1|0)$',
      '^your',
      '(?<char>[\\w\\*\\.])\\k<char>{3}',
      '^(?<repeated>.)\\k<repeated>*$',
      '\\.\\.\\.',
    ],
  },
  {
    category: 'PLACEHOLDER',
    patterns: [
      '^(?:\\\\)?\\${1,2}\\{[^}]+\\}',
      '(?:\\\\)?\\${1,2}\\{[^}]+\\}$',
      '^\\#{1,2}[{(]',
      '^\\(\\(.*\\)\\)$',
      '^\\$\\(',
      '^`[^`]+`$',
      '^(?:\\\\)?\\${1,2}\\w+\\${0,2}$',
      '^%?\\{[^}]+\\}$',
      '^\\{{2,}[^}]+\\}{2,}',
      '\\b(get)?env(iron)?\\b',
      'process\\.env\\.',
      '^%[^%]+%$',
      'config[\\(\\[]',
      'Read-Host',
      '^<[\\w\\.\\t -]{1,10}>',
      '^<[^>]+>$',
      '^\\\\?\\([^)]+\\)$',
      '^\\[[^\\]]+\\]$',
      '^%\\([^)]+\\)s$',
      '^@\\w+\\([^)]*\\)$',
      '^__.+__$',
      '^(?:todo|fixme)\\b',
    ],
  },
  {
    category: 'ENCRYPTED',
    patterns: [
      '^encrypted:[a-zA-Z0-9+\\/]+={0,2}$',
      '^\\{cipher\\}',
      '^enc\\[',
      '^%?enc\\{',
      '^enc\\([^)]*\\)$',
    ],
  },
  {
    category: 'REFERENCE',
    patterns: ['^arn:aws:secretsmanager:', '^op:\\/[\\S\\ ]+$', '^vault\\['],
  },
  {
    category: 'STRUCTURED_FORMAT',
    patterns: [
      '^(?:/[a-z0-9_.-]+){3,}$',
      '^(?:>=?|<=?|[~^])?v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$',
      '^v?\\d+(?:\\.\\d+)+(?:\\([^()]*\\))+$',
    ],
  },
];

export const exactMatchGroups: ExactMatchGroup[] = [
  {
    category: 'SECRET',
    values: [
      'abc123',
      'changeit',
      'changeme',
      'disabled',
      'enabled',
      'hunter2',
      'letmein',
      'optional',
      'random',
      'string',
      'token',
      'unknown',
    ],
  },
];
