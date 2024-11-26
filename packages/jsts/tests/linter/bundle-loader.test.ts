/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { Linter } from 'eslint';
import { loadBundles, loadCustomRules } from '../../src/linter/bundle-loader.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import path from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import { setContext } from '../../../shared/src/helpers/context.js';
import { CustomRule } from '../../src/linter/custom-rules/custom-rule.js';

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
      bundles: [pathToFileURL(bundlePath).href],
    });

    const linter = new Linter();

    const customRuleId = 'custom-rule-file';
    // @ts-ignore
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
