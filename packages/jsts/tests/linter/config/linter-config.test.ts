/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Rule } from 'eslint';
import { setContext } from '@sonar/shared/helpers';
import { createLinterConfig, RuleConfig } from '../../../src/linter';

describe('createLinterConfig', () => {
  beforeEach(() => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should enable environments', () => {
    const { env } = createLinterConfig([], new Map(), ['node', 'jquery']);
    expect(env).toEqual(
      expect.objectContaining({
        node: true,
        jquery: true,
      }),
    );
  });

  it('should enable globals', () => {
    const { globals } = createLinterConfig([], new Map(), [], ['_', '$']);
    expect(globals).toEqual(
      expect.objectContaining({
        _: true,
        $: true,
      }),
    );
  });

  it('should enable rules', () => {
    const inputRules: RuleConfig[] = [{ key: 'foo', configurations: [], fileTypeTarget: ['MAIN'] }];
    const linterRules = new Map<string, Rule.RuleModule>([
      ['foo', { module: 42 } as unknown as Rule.RuleModule],
      ['bar', { module: 24 } as unknown as Rule.RuleModule],
    ]);
    const { rules } = createLinterConfig(inputRules, linterRules);
    expect(rules).toEqual(
      expect.objectContaining({
        foo: ['error'],
      }),
    );
  });

  it('should enable internal custom rules by default', () => {
    const { rules } = createLinterConfig([], new Map());
    expect(rules).toEqual({
      'internal-cognitive-complexity': ['error', 'metric'],
      'internal-symbol-highlighting': ['error'],
    });
  });

  it('should not enable internal custom rules in SonarLint context', () => {
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: true,
      bundles: [],
    });
    const { rules } = createLinterConfig([], new Map());
    expect(rules).toEqual({});
  });
});
