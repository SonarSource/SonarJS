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
import { expect } from 'expect';
import { Linter, type Rule } from 'eslint';
import { getCurrentFileModuleReferences } from '../../../../src/jsts/rules/helpers/module.js';

describe('getCurrentFileModuleReferences', () => {
  it('collects literal module references throughout a file', () => {
    let imports = new Set<string>();
    const captureImports: Rule.RuleModule = {
      create(context) {
        return {
          Program() {
            imports = new Set(getCurrentFileModuleReferences(context.sourceCode));
          },
        };
      },
    };

    new Linter().verify(
      `
        import value from 'static-import';
        export { value } from 'named-export';
        export * from 'all-export';
        require('standalone-require');
        function load() {
          return import('nested-dynamic').then(module => module.default);
        }
        function useLoader(require) {
          require('shadowed-require');
        }
      `,
      {
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
        },
        plugins: {
          test: {
            rules: {
              captureImports,
            },
          },
        },
        rules: {
          'test/captureImports': 'error',
        },
      },
    );

    expect(imports).toEqual(
      new Set([
        'static-import',
        'named-export',
        'all-export',
        'standalone-require',
        'nested-dynamic',
      ]),
    );
  });
});
