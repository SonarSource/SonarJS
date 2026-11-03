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
import { it } from 'node:test';
import { Linter, type Rule } from 'eslint';
import { rule } from './rule.js';

it('checks global define writes without scanning scope references', () => {
  const moduleCount = 100;
  const factory = 'define([], function () { if (x) {} if (x) {} });';
  const modules = factory.repeat(moduleCount);
  const linter = new Linter();
  for (const configuredGlobal of [false, true]) {
    for (const write of ['', 'define = other;']) {
      let checks = 0;
      const measuredRule: Rule.RuleModule = {
        ...rule,
        create(context) {
          const listeners = rule.create(context);
          return {
            ...listeners,
            Program(node) {
              const globalScope = context.sourceCode.scopeManager!.globalScope!;
              const references = configuredGlobal
                ? globalScope.set.get('define')!.references
                : globalScope.through;
              for (const reference of references) {
                if (reference.identifier.name === 'define') {
                  const isWrite = reference.isWrite.bind(reference);
                  reference.isWrite = () => {
                    checks++;
                    return isWrite();
                  };
                }
              }
              listeners.Program!(node);
            },
          };
        },
      };
      const config: Linter.Config = {
        languageOptions: { globals: configuredGlobal ? { define: 'writable' } : {} },
        plugins: { test: { rules: { complexity: measuredRule } } },
        rules: { 'test/complexity': ['error', { threshold: 2 }] },
      };
      // A local call must not affect global define matching.
      const code = `function local(define) { ${factory} } ${modules} ${write}`;
      for (let pass = 0; pass < 2; pass++) {
        checks = 0;
        const issues = linter.verify(code, config);
        assert.equal(issues.length, write ? moduleCount + 1 : 1);
        assert.equal(checks, 0);
      }
    }
  }
});

it('does not scan scope declarations for require calls or valid define factories', () => {
  const code = [
    ...Array.from({ length: 200 }, (_, index) => `var v${index} = require('dep');`),
    'define([], function () { if (x) {} if (x) {} });',
  ].join('\n');
  let scans = 0;
  const measuredRule: Rule.RuleModule = {
    ...rule,
    create(context) {
      const listeners = rule.create(context);
      return {
        ...listeners,
        Program(node) {
          for (const scope of context.sourceCode.scopeManager!.scopes) {
            scope.variables.find = () => {
              scans++;
              return undefined;
            };
          }
          listeners.Program!(node);
        },
      };
    },
  };
  const issues = new Linter().verify(code, {
    plugins: { test: { rules: { complexity: measuredRule } } },
    rules: { 'test/complexity': ['error', { threshold: 2 }] },
  });
  assert.equal(issues.length, 0);
  assert.equal(scans, 0);
});
