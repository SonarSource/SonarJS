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
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { expect } from 'expect';
import { Linter, type Linter as LinterNS, type Rule } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import {
  getCurrentFileModuleReferences,
  getFullyQualifiedName,
  importsOrDependsOnModule,
  isGlobalShadowed,
} from '../../../../src/jsts/rules/helpers/module.js';
import {
  getReactVersion,
  getVueVersion,
} from '../../../../src/jsts/rules/helpers/dependency-manifests/dependencies.js';
import { getPackageJsonManifestsSanitizePaths } from '../../../../src/jsts/rules/helpers/dependency-manifests/all-in-parent-dirs.js';
import path from 'node:path';

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

function collectFullyQualifiedNames(
  source: string,
  identifiers: string[],
): Map<string, string | null> {
  const fullyQualifiedNames = new Map<string, string | null>();
  const captureNames: Rule.RuleModule = {
    create(context) {
      return {
        Identifier(node) {
          if (
            identifiers.includes(node.name) &&
            node.parent?.type === 'MemberExpression' &&
            node.parent.object === node
          ) {
            fullyQualifiedNames.set(node.name, getFullyQualifiedName(context, node));
          }
        },
      };
    },
  };

  new Linter().verify(source, {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
    },
    plugins: {
      test: {
        rules: {
          captureNames,
        },
      },
    },
    rules: {
      'test/captureNames': 'error',
    },
  });

  return fullyQualifiedNames;
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

describe('getFullyQualifiedName', () => {
  it('does not resolve type-only imports', () => {
    const fullyQualifiedNames = collectFullyQualifiedNames(
      `
        import type DefaultType from 'default-module';
        import { type NamedType } from 'named-module';
        import type EqualsType = require('equals-module');

        DefaultType.use();
        NamedType.use();
        EqualsType.use();
      `,
      ['DefaultType', 'NamedType', 'EqualsType'],
    );

    expect(fullyQualifiedNames).toEqual(
      new Map([
        ['DefaultType', null],
        ['NamedType', null],
        ['EqualsType', null],
      ]),
    );
  });
});

describe('isGlobalShadowed', () => {
  it('returns false for the global require', () => {
    expect(getShadowing("require('lodash');", 'require')).toBe(false);
  });

  it('returns true for a require parameter', () => {
    expect(getShadowing("function load(require) { require('lodash'); }", 'require')).toBe(true);
  });

  it('returns false for the global define', () => {
    expect(getShadowing("define(['a'], function (a) {});", 'define')).toBe(false);
  });

  it('returns true for a locally declared define', () => {
    expect(
      getShadowing(
        "function define(factory) { return factory; } define(['a'], function (a) {});",
        'define',
      ),
    ).toBe(true);
  });
});

describe('importsOrDependsOnModule', () => {
  const fixtures = path.join(import.meta.dirname, 'fixtures');
  const cwd = path.join(fixtures, 'external-library');
  const filename = path.join(cwd, 'source.js');
  const frameworkCwd = path.join(fixtures, 'framework-versions', 'app');
  const frameworkFilename = path.join(frameworkCwd, 'source.js');

  it('finds dependencies above the working directory in standalone ESLint', () => {
    expect(dependsOnFoo(cwd, filename)).toBe(true);
  });

  it('keeps dependency lookup bounded by the working directory in Sonar runtime', () => {
    expect(dependsOnFoo(cwd, filename, { sonarRuntime: true })).toBe(false);
  });

  it('finds framework versions above the working directory in standalone ESLint', () => {
    expect(getFrameworkVersions(frameworkCwd, frameworkFilename)).toEqual(['18.2.0', '^3.4.0']);
  });

  it('keeps framework version lookup bounded in Sonar runtime', () => {
    expect(getFrameworkVersions(frameworkCwd, frameworkFilename, { sonarRuntime: true })).toEqual([
      null,
      null,
    ]);
  });

  it('ignores dependencies outside the repository containing the linted file', t => {
    const ancestor = fs.mkdtempSync(path.join(tmpdir(), 'sonarjs-dependency-boundary-'));
    t.after(() => fs.rmSync(ancestor, { recursive: true, force: true }));
    fs.writeFileSync(path.join(ancestor, 'package.json'), '{"dependencies":{"foo":"1.0.0"}}');
    const project = path.join(ancestor, 'project');
    const projectCwd = path.join(project, 'app');
    fs.mkdirSync(path.join(project, '.git'), { recursive: true });
    fs.mkdirSync(projectCwd);

    expect(dependsOnFoo(projectCwd, path.join(projectCwd, 'source.js'))).toBe(false);
    expect(hasPackageJson(projectCwd, path.join(projectCwd, 'source.js'))).toBe(false);

    const projectWithManifest = path.join(ancestor, 'project-with-manifest');
    const nestedCwd = path.join(projectWithManifest, 'app');
    fs.mkdirSync(path.join(projectWithManifest, '.git'), { recursive: true });
    fs.mkdirSync(nestedCwd);
    fs.writeFileSync(path.join(projectWithManifest, 'package.json'), '{"private":true}');
    const nestedFilename = path.join(nestedCwd, 'source.js');
    expect(hasPackageJson(nestedCwd, nestedFilename)).toBe(true);
    expect(hasPackageJson(nestedCwd, nestedFilename, { sonarRuntime: true })).toBe(false);

    const unversionedCwd = path.join(ancestor, 'unversioned', 'app');
    fs.mkdirSync(unversionedCwd, { recursive: true });
    const unversionedFilename = path.join(unversionedCwd, 'source.js');
    expect(dependsOnFoo(unversionedCwd, unversionedFilename)).toBe(false);
    expect(hasPackageJson(unversionedCwd, unversionedFilename)).toBe(false);
  });
});

function dependsOnFoo(cwd: string, filename: string, settings: Record<string, unknown> = {}) {
  let result = false;
  const captureDependencies: Rule.RuleModule = {
    create(context) {
      result = importsOrDependsOnModule(context, [], ['foo']);
      return {};
    },
  };

  new Linter({ cwd }).verify(
    '',
    {
      languageOptions: { ecmaVersion: 'latest' },
      plugins: { test: { rules: { captureDependencies } } },
      rules: { 'test/captureDependencies': 'error' },
      settings,
    },
    filename,
  );

  return result;
}

function getFrameworkVersions(
  cwd: string,
  filename: string,
  settings: Record<string, unknown> = {},
) {
  let result: [string | null, string | null] = [null, null];
  const captureVersions: Rule.RuleModule = {
    create(context) {
      result = [getReactVersion(context), getVueVersion(context)];
      return {};
    },
  };

  new Linter({ cwd }).verify(
    '',
    {
      languageOptions: { ecmaVersion: 'latest' },
      plugins: { test: { rules: { captureVersions } } },
      rules: { 'test/captureVersions': 'error' },
      settings,
    },
    filename,
  );

  return result;
}

function hasPackageJson(cwd: string, filename: string, settings: Record<string, unknown> = {}) {
  let result = false;
  const captureManifest: Rule.RuleModule = {
    create(context) {
      result = getPackageJsonManifestsSanitizePaths(context).length > 0;
      return {};
    },
  };

  new Linter({ cwd }).verify(
    '',
    {
      languageOptions: { ecmaVersion: 'latest' },
      plugins: { test: { rules: { captureManifest } } },
      rules: { 'test/captureManifest': 'error' },
      settings,
    },
    filename,
  );

  return result;
}

function getShadowing(source: string, name: string): boolean | undefined {
  let shadowed: boolean | undefined;
  const captureCall: Rule.RuleModule = {
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type === 'Identifier' && node.callee.name === name) {
            shadowed = isGlobalShadowed(context.sourceCode, node, name);
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
          captureCall,
        },
      },
    },
    rules: {
      'test/captureCall': 'error',
    },
  });

  return shadowed;
}
