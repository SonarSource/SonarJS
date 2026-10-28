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
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import { Linter } from 'eslint';
import { rule as deprecationRule } from '../../../src/jsts/rules/S1874/rule.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { build } from '../../../src/jsts/builders/build.js';
import { IncrementalCompilerHost } from '../../../src/jsts/program/compilerHost.js';
import {
  createStandardProgram,
  createOrGetCachedProgramForFile,
} from '../../../src/jsts/program/factory.js';
import {
  createProgramOptionsFromJson,
  createProgramOptionsFromEffectiveOptions,
} from '../../../src/jsts/program/tsconfig/options.js';
import {
  clearSourceFileContentCache,
  setSourceFilesContext,
} from '../../../src/jsts/program/cache/sourceFileCache.js';
import { getProgramCacheManager } from '../../../src/jsts/program/cache/programCache.js';
import { isRequiredParserServices } from '../../../src/jsts/rules/helpers/parser-services.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { jsTsInput } from '../tools/helpers/input.js';

const baseDir = normalizeToAbsolutePath('/vue-project');
const file = normalizeToAbsolutePath('/vue-project/Component.vue');
const script = 'const n: number = 1; n.toFixed();';
const setup = `<script setup lang="ts">${script}</script>`;
const template = '<template><p>{{ n }}</p></template>';
const ordinary = `<script lang="ts">${script}</script>`;
const normalExport = '<script lang="ts">export const outside = 1;</script>';

const cases: [string, string, string | undefined][] = [
  [
    'ordinary, template and CSS helpers',
    `${template}${ordinary}<style>p { color: v-bind(n) }</style>`,
    'number',
  ],
  ['setup', `${template}${setup}`, 'number'],
  ['combined', `${template}${normalExport}${setup}`, 'number'],
  ['combined in reverse source order', `${template}${setup}${normalExport}`, 'number'],
  [
    'generic setup',
    `${template}<script setup lang="ts" generic="T extends string">const n: T = 'a' as T;</script>`,
    'string',
  ],
  [
    'generic combined',
    `${normalExport}<script setup lang="ts" generic="T extends string">const n: T = 'a' as T;</script>`,
    'string',
  ],
  ['JavaScript', `${template}<script>const n = 1; n.toFixed();</script>`, '1'],
  ['JSX', '<script lang="jsx">const n = 1; const el = <div>{n}</div>;</script>', '1'],
  ['TSX', '<script lang="tsx">const n: number = 1; const el = <div>{n}</div>;</script>', 'number'],
  [
    'TS assertion with JSX retry',
    '<script lang="ts">const n = <number>1; n.toFixed();</script>',
    'number',
  ],
  ['scriptless', template, undefined],
  ['empty setup', `${template}<script setup lang="ts"></script>`, undefined],
];

function options() {
  return createProgramOptionsFromJson({ noLib: true, jsx: 'preserve' }, [file], baseDir);
}

async function parsed(raw: string, program?: ts.Program, jsx?: boolean) {
  return build(await jsTsInput({ filePath: file, fileContent: raw, language: 'ts', program }), {
    jsx,
  }).sourceCode;
}

async function identifierTypes(raw: string, program: ts.Program) {
  const sourceCode = await parsed(raw, program);
  const services = sourceCode.parserServices;
  expect(isRequiredParserServices(services)).toBe(true);
  if (!isRequiredParserServices(services)) {
    throw new Error('Missing Vue script Program');
  }
  expect(services.program).toBe(program);
  const checker = program.getTypeChecker();
  const types: string[] = [];
  function visit(node: TSESTree.Node) {
    if (node.type === 'Identifier' && node.name === 'n') {
      // ESTree offsets must refer to the raw SFC; mapped TS nodes refer to its projection.
      expect(raw.slice(node.range[0], node.range[0] + node.name.length)).toBe(node.name);
      const mapped = services.esTreeNodeToTSNodeMap.get(node);
      expect(mapped).toBeDefined();
      types.push(checker.typeToString(checker.getTypeAtLocation(mapped)));
    }
    for (const key of sourceCode.visitorKeys[node.type] ?? []) {
      const children = (node as unknown as Record<string, TSESTree.Node | TSESTree.Node[]>)[key];
      for (const child of Array.isArray(children) ? children : [children]) {
        if (child) visit(child);
      }
    }
  }
  visit(sourceCode.ast as unknown as TSESTree.Node);
  return types;
}

describe('Vue scripts in SonarJS Programs', () => {
  beforeEach(() => {
    clearSourceFileContentCache();
    getProgramCacheManager().clear();
  });

  for (const builder of [false, true]) {
    for (const [name, raw, type] of cases) {
      it(`${builder ? 'builder' : 'standard'}: ${name}`, async () => {
        setSourceFilesContext({ [file]: { fileContent: raw } });
        const config = options();
        const host = new IncrementalCompilerHost(config.options, baseDir);
        const program = builder
          ? ts
              .createSemanticDiagnosticsBuilderProgram(config.rootNames, config.options, host)
              .getProgram()
          : createStandardProgram({ ...config, host });
        expect(program.getSourceFile(file)).toBeDefined();
        expect(host.readFile(file)).toBe(raw);
        const types = await identifierTypes(raw, program);
        if (type) {
          expect(types.length).toBeGreaterThan(0);
          expect(new Set(types)).toEqual(new Set([type]));
        } else {
          expect(types).toEqual([]);
        }
      });
    }
  }

  it('rejects stale Programs instead of silently returning old types', async () => {
    setSourceFilesContext({ [file]: { fileContent: ordinary } });
    const config = options();
    const program = createStandardProgram({
      ...config,
      host: new IncrementalCompilerHost(config.options, baseDir),
    });
    const changed = ordinary.replace('n: number = 1', 'n: string = "new"');
    expect((await parsed(changed, program)).parserServices.program).toBeFalsy();
    // Raw/unprojected supplied Programs must also remain syntax-only.
    const rawProgram = ts.createProgram([file], config.options, {
      ...ts.createCompilerHost(config.options),
      getSourceFile: name =>
        name === file
          ? ts.createSourceFile(file, ordinary, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
          : undefined,
    });
    expect((await parsed(ordinary, rawProgram)).parserServices.program).toBeFalsy();
  });

  it('rejects a different JSX mode even when the script text is identical', async () => {
    setSourceFilesContext({ [file]: { fileContent: ordinary } });
    const config = options();
    config.options.jsx = ts.JsxEmit.None;
    const program = createStandardProgram({
      ...config,
      host: new IncrementalCompilerHost(config.options, baseDir),
    });
    expect((await parsed(ordinary, program, true)).parserServices.program).toBeFalsy();
    expect((await parsed(ordinary, program, false)).parserServices.program).toBe(program);
  });

  it('keeps malformed Vue files in the Program without failing other files', async () => {
    const broken = '<script setup lang="ts">const n = ;</script>';
    setSourceFilesContext({ [file]: { fileContent: broken } });
    const config = options();
    const program = createStandardProgram({
      ...config,
      host: new IncrementalCompilerHost(config.options, baseDir),
    });
    expect(program.getSourceFile(file)?.text).toBe('');
    await expect(parsed(broken, program)).rejects.toThrow('Expression expected');
  });

  it('reuses the cached Program for unchanged projections and rebuilds for script edits', async () => {
    const original = `${template}\n${ordinary}`;
    setSourceFilesContext({ [file]: { fileContent: original } });
    const getProgram = () => createOrGetCachedProgramForFile(baseDir, file, options)!;
    const initial = getProgram();
    expect(await identifierTypes(original, initial)).toContain('number');
    expect(getProgram()).toBe(initial);

    const templateEdit = original.replace(template, '<template>\n<div>{{ n }}</div>\n</template>');
    setSourceFilesContext({ [file]: { fileContent: templateEdit } });
    expect(getProgram()).toBe(initial);
    expect(await identifierTypes(templateEdit, initial)).toContain('number');

    const scriptEdit = templateEdit.replace('n: number = 1', 'n: string = "new"');
    setSourceFilesContext({ [file]: { fileContent: scriptEdit } });
    const updated = getProgram();
    expect(updated).not.toBe(initial);
    expect(await identifierTypes(scriptEdit, updated)).toContain('string');
  });

  it('refreshes unchanged Vue scripts when a supplied imported dependency changes', async () => {
    const dep = normalizeToAbsolutePath('/vue-project/dep.ts');
    const raw = '<script lang="ts">import { n } from "./dep"; n;</script>';
    setSourceFilesContext({
      [file]: { fileContent: raw },
      [dep]: { fileContent: 'export const n: number = 1;' },
    });
    const getProgram = () => createOrGetCachedProgramForFile(baseDir, file, options)!;
    const initial = getProgram();
    expect(await identifierTypes(raw, initial)).toContain('number');
    setSourceFilesContext({
      [file]: { fileContent: raw },
      [dep]: { fileContent: 'export const n: string = "new";' },
    });
    const updated = getProgram();
    expect(updated).not.toBe(initial);
    expect(await identifierTypes(raw, updated)).toContain('string');
  });
  for (const combined of [false, true]) {
    it(`maps TypeScript deprecation diagnostics to raw Vue locations (combined=${combined})`, async () => {
      const declaration =
        '<script lang="ts">\n/** @deprecated use next */\nfunction old() {}\n' +
        (combined ? '</script>' : 'old();\n</script>');
      const raw =
        template +
        '\n' +
        declaration +
        (combined ? '<script setup lang="ts">\nold();\n</script>' : '');
      setSourceFilesContext({ [file]: { fileContent: raw } });
      const config = options();
      const program = createStandardProgram({
        ...config,
        host: new IncrementalCompilerHost(config.options, baseDir),
      });
      const sourceCode = await parsed(raw, program);
      const messages = new Linter({ cwd: baseDir }).verify(
        sourceCode,
        [
          {
            files: ['**/*.vue'],
            plugins: { sonarjs: { rules: { deprecation: deprecationRule } } },
            rules: { 'sonarjs/deprecation': 'error' },
          },
        ],
        { filename: file },
      );
      expect(messages).toHaveLength(1);
      const expected = sourceCode.getLocFromIndex(raw.indexOf('old();'));
      expect(messages[0]).toMatchObject({
        line: expected.line,
        column: expected.column + 1,
        endColumn: expected.column + 4,
      });
    });
  }

  it('detects Vue edits independently in hosts sharing the raw-content cache', async () => {
    setSourceFilesContext({ [file]: { fileContent: ordinary } });
    const config = options();
    const firstHost = new IncrementalCompilerHost(config.options, baseDir);
    const first = ts.createSemanticDiagnosticsBuilderProgram(
      config.rootNames,
      config.options,
      firstHost,
    );
    const secondHost = new IncrementalCompilerHost(config.options, baseDir);
    createStandardProgram({ ...config, host: secondHost });
    const changed = ordinary.replace('n: number = 1', 'n: string = "new"');
    setSourceFilesContext({ [file]: { fileContent: changed } });
    expect(secondHost.updateFile(file, changed)).toBe(true);
    expect(firstHost.updateFile(file, changed)).toBe(true);
    const updated = ts
      .createSemanticDiagnosticsBuilderProgram(config.rootNames, config.options, firstHost, first)
      .getProgram();
    expect(await identifierTypes(changed, updated)).toContain('string');
  });
  it('refreshes cached membership when a Vue script changes its imports', async () => {
    const dep = normalizeToAbsolutePath('/vue-project/dep.ts');
    const other = normalizeToAbsolutePath('/vue-project/other.ts');
    const raw = '<script lang="ts">import { n } from "./dep"; n;</script>';
    setSourceFilesContext({
      [file]: { fileContent: raw },
      [dep]: { fileContent: 'export const n: number = 1;' },
    });
    const getProgram = () => createOrGetCachedProgramForFile(baseDir, file, options)!;
    getProgram();
    const changed = raw.replace('./dep', './other');
    setSourceFilesContext({
      [file]: { fileContent: changed },
      [other]: { fileContent: 'export const n: string = "new";' },
    });
    const updated = getProgram();
    expect(await identifierTypes(changed, updated)).toContain('string');
    const manager = getProgramCacheManager();
    expect(manager.findProgramForFile(other)?.program.getProgram()).toBe(updated);
    expect(manager.findProgramForFile(dep)).toBeUndefined();
  });
  it('includes Vue roots restored from older orphan selections without the internal extension flag', async () => {
    setSourceFilesContext({ [file]: { fileContent: ordinary } });
    const config = createProgramOptionsFromEffectiveOptions({ noLib: true }, [file]);
    const program = createStandardProgram({
      ...config,
      host: new IncrementalCompilerHost(config.options, baseDir),
    });
    expect(await identifierTypes(ordinary, program)).toContain('number');
  });
});
