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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as metas from '../../../src/css/rules/metas.js';
import * as plugins from '../../../src/css/rules/rules.js';
import type { CssRuleDefinition } from '../../../src/css/rules/types.js';
import {
  cssRulesMeta,
  cssOnlyRuleKeys,
  reverseCssRuleKeyMap,
} from '../../../src/css/rules/metadata.js';

const definitions: [string, CssRuleDefinition][] = Object.entries(metas);

describe('CSS rule registry', () => {
  it('exports exactly the local plugins with their declared Stylelint keys', () => {
    const localDefinitions = definitions.filter(([, meta]) => meta.implementation !== 'external');
    assert.deepEqual(Object.keys(plugins).sort(), localDefinitions.map(([key]) => key).sort());
    for (const [key, meta] of localDefinitions) {
      const plugin = plugins[key as keyof typeof plugins];
      assert.equal(plugin.ruleName, meta.bindings[0].stylelintKey);
    }
  });

  it('keeps all bindings and reverse mappings, including S1874', () => {
    assert.equal(
      cssRulesMeta.length,
      definitions.reduce((count, [, meta]) => count + meta.bindings.length, 0),
    );
    assert.equal(reverseCssRuleKeyMap.size, cssRulesMeta.length);
    assert.deepEqual(
      cssRulesMeta.filter(meta => meta.sqKey === 'S1874').map(meta => meta.stylelintKey),
      [
        'selector-no-deprecated',
        'declaration-property-value-keyword-no-deprecated',
        'at-rule-no-deprecated',
      ],
    );
    for (const meta of cssRulesMeta) {
      assert.equal(reverseCssRuleKeyMap.get(meta.stylelintKey), meta.sqKey);
    }
    assert.ok(!cssRulesMeta.some(meta => meta.sqKey === 'S2260'));
  });

  it('routes local and upstream CSS-only rules without restricting other rules', () => {
    assert.ok(cssOnlyRuleKeys.has('sonar/declaration-property-value-no-unknown'));
    assert.ok(cssOnlyRuleKeys.has('sonar/function-no-unknown'));
    assert.ok(!cssOnlyRuleKeys.has('sonar/motion-reduced'));
    assert.ok(cssOnlyRuleKeys.has('at-rule-no-unknown'));
    assert.ok(!cssOnlyRuleKeys.has('sonar/no-commented-code'));
    assert.ok(!cssOnlyRuleKeys.has('color-no-invalid-hex'));
  });
});
