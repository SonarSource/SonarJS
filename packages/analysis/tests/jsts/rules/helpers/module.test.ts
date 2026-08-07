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
import { Linter, type Linter as LinterNS, type Rule } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import {
  getCurrentFileModuleReferences,
  isRequireShadowed,
} from '../../../../src/jsts/rules/helpers/module.js';

function collectModuleReferences(source: string, parser?: LinterNS.Parser): Set<string> {
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

  new Linter().verify(source, {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser,
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
  });

  return imports;
}

describe('getCurrentFileModuleReferences', () => {
  it('collects literal module references throughout a file', () => {
    const imports = collectModuleReferences(`
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
      `);

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

  it('collects inline type-only import references in TypeScript', () => {
    const imports = collectModuleReferences(
      `
        type Props = import('inline-type-import').ComponentProps<'div'>;
        type Local = import('./local-types').Thing;
      `,
      tsParser,
    );

    expect(imports).toEqual(new Set(['inline-type-import', './local-types']));
  });

  it('handles AST nodes with very large child arrays', () => {
    const values = Array.from({ length: 200_000 }, () => '0').join(',');
    const imports = collectModuleReferences(
      `const values = [${values}]; require('large-array-import');`,
    );

    expect(imports).toEqual(new Set(['large-array-import']));
  });
});

describe('isRequireShadowed', () => {
  it('returns false for the global require', () => {
    expect(getRequireShadowing("require('lodash');")).toBe(false);
  });

  it('returns true for a require parameter', () => {
    expect(getRequireShadowing("function load(require) { require('lodash'); }")).toBe(true);
  });
});

function getRequireShadowing(source: string): boolean | undefined {
  let shadowed: boolean | undefined;
  const captureRequire: Rule.RuleModule = {
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
            shadowed = isRequireShadowed(context.sourceCode, node);
          }
        },
      };
    },
  };

  new Linter().verify(source, {
    languageOptions: {
      ecmaVersion: 'latest',
    },
    plugins: {
      test: {
        rules: {
          captureRequire,
        },
      },
    },
    rules: {
      'test/captureRequire': 'error',
    },
  });

  return shadowed;
}
