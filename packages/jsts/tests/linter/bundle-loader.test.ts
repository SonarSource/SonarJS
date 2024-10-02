/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { Linter } from 'eslint';
import { loadBundles, loadCustomRules } from '../../src/linter/bundle-loader.js';
import { CustomRule } from '../../src/linter/custom-rules/index.js';
import { setContext } from '../../../shared/src/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import path from 'node:path/posix';

describe('BundleLoader', () => {
  it('should only load rules when requested', async () => {
    const bundlePath = path.join(
      import.meta.dirname,
      'fixtures',
      'index',
      'custom-rule-bundle',
      'rules.js',
    );
    setContext({
      workDir: '/tmp/dir',
      shouldUseTypeScriptParserForJS: false,
      sonarlint: false,
      bundles: [bundlePath],
    });

    const linter = new Linter();

    const customRuleId = 'custom-rule-file';
    const ruleModule = await import('./fixtures/wrapper/custom-rule.js');
    const customRules: CustomRule[] = [
      {
        ruleId: customRuleId,
        ruleConfig: [],
        ruleModule: ruleModule.rule,
      },
    ];

    expect(linter.getRules().get('max-params')).toBeDefined();
    expect(linter.getRules().get('S6328')).toBeUndefined();
    expect(linter.getRules().get('custom-rule-file')).toBeUndefined();
    expect(linter.getRules().get('custom-rule')).toBeUndefined();
    expect(linter.getRules().get('internal-cognitive-complexity')).toBeUndefined();

    await loadBundles(linter, ['internalRules']);
    expect(linter.getRules().get('S6328')).toBeDefined();
    expect(linter.getRules().get('custom-rule-file')).toBeUndefined();
    expect(linter.getRules().get('custom-rule')).toBeUndefined();
    expect(linter.getRules().get('internal-cognitive-complexity')).toBeUndefined();

    loadCustomRules(linter, customRules);
    expect(linter.getRules().get('custom-rule-file')).toBeDefined();
    expect(linter.getRules().get('custom-rule')).toBeUndefined();
    expect(linter.getRules().get('internal-cognitive-complexity')).toBeUndefined();

    await loadBundles(linter, ['contextRules']);
    expect(linter.getRules().get('custom-rule')).toBeDefined();
    expect(linter.getRules().get('internal-cognitive-complexity')).toBeUndefined();

    await loadBundles(linter, ['internalCustomRules']);
    expect(linter.getRules().get('internal-cognitive-complexity')).toBeDefined();
  });
});
