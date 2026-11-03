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
import { Linter, type SourceCode, type Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { build } from '../../../src/jsts/builders/build.js';
import { jsTsInput } from '../tools/helpers/input.js';
import { IncrementalCompilerHost } from '../../../src/jsts/program/compilerHost.js';
import {
  createStandardProgram,
  createOrGetCachedProgramForFile,
} from '../../../src/jsts/program/factory.js';
import { createProgramOptionsFromJson } from '../../../src/jsts/program/tsconfig/options.js';
import {
  clearSourceFileContentCache,
  setSourceFilesContext,
} from '../../../src/jsts/program/cache/sourceFileCache.js';
import { getProgramCacheManager } from '../../../src/jsts/program/cache/programCache.js';
import { isRequiredParserServices } from '../../../src/jsts/rules/helpers/parser-services.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { rule as assertions } from '../../../src/jsts/rules/S4325/index.js';
import { rule as constituents } from '../../../src/jsts/rules/S6571/index.js';
import { rule as argumentsRule } from '../../../src/jsts/rules/S4157/index.js';
import { rule as deprecation } from '../../../src/jsts/rules/S1874/rule.js';
import { getVueScript } from '../../../src/jsts/parsers/vue.js';
import { applyVueGenericServices } from '../../../src/jsts/parsers/vue-generics.js';
import { parsersMap } from '../../../src/jsts/parsers/eslint.js';

const baseDir = normalizeToAbsolutePath('/vue-generics');
const file = normalizeToAbsolutePath(`${baseDir}/Component.vue`);
const dependency = normalizeToAbsolutePath(`${baseDir}/dep.ts`);
const normal = '<script lang="ts">export const outside = 1;</script>';

function options() {
  return createProgramOptionsFromJson(
    { noLib: true, strict: true, target: 'esnext', jsx: 'preserve' },
    [file],
    baseDir,
  );
}
function create(
  raw: string,
  builder: boolean,
  dependencyText = 'export type Text = string; export const text: string = "";',
) {
  setSourceFilesContext({
    [file]: { fileContent: raw },
    [dependency]: { fileContent: dependencyText },
  });
  const config = options();
  const host = new IncrementalCompilerHost(config.options, baseDir);
  return builder
    ? ts
        .createSemanticDiagnosticsBuilderProgram(config.rootNames, config.options, host)
        .getProgram()
    : createStandardProgram({ ...config, host });
}
async function parse(raw: string, program?: ts.Program) {
  return build(await jsTsInput({ filePath: file, fileContent: raw, language: 'ts', program }))
    .sourceCode;
}
function verify(source: SourceCode, rule: Rule.RuleModule) {
  return new Linter({ cwd: baseDir }).verify(
    source,
    [
      {
        files: ['**/*.vue'],
        plugins: { test: { rules: { rule } } },
        rules: { 'test/rule': 'error' },
      },
    ],
    { filename: file },
  );
}
function nodes(source: SourceCode, predicate: (node: TSESTree.Node) => boolean) {
  const found: TSESTree.Node[] = [];
  const visit = (node: TSESTree.Node) => {
    if (predicate(node)) found.push(node);
    for (const key of source.visitorKeys[node.type] ?? []) {
      const value = (node as unknown as Record<string, TSESTree.Node | TSESTree.Node[]>)[key];
      for (const child of Array.isArray(value) ? value : [value]) if (child) visit(child);
    }
  };
  visit(source.ast as TSESTree.Node);
  return found;
}
function services(source: SourceCode) {
  const result = source.parserServices;
  if (!isRequiredParserServices(result)) throw new Error('Missing generic Vue Program');
  return result;
}

describe('Vue generic compiler representation', () => {
  beforeEach(() => {
    clearSourceFileContentCache();
    getProgramCacheManager().clear();
  });
  for (const builder of [false, true]) {
    for (const order of ['setup', 'normal-first', 'setup-first']) {
      it(`${builder ? 'builder' : 'standard'}: preserves generic relationships and original fixes (${order})`, async () => {
        const setup = `<script setup lang="ts" generic="T extends string, U extends unknown = unknown, V extends T = T">
import type { Text } from './dep';
declare const value: Text;
const necessary = value as T;
const checked: T = necessary;
const redundant = value as string;
type Value = T | 'fallback';
const accepted: Value = 'fallback';
type Redundant = 'literal' | string;
type Option<Arg = unknown> = { value: Arg };
type Alias = U;
declare const genericValue: U;
let direct: Option<U>;
let indirect: Option<typeof genericValue>;
let aliased: Option<Alias>;
type Dependent<Arg = U> = { value: Arg };
let differentDefault: Dependent<unknown>;
let redundantOption: Option<unknown>;
function shadow<T extends string>(input: T) { return input as T; }
/** @deprecated */
function oldApi() {}
oldApi();
</script>`;
        const raw =
          '<template>{{ necessary }}</template>\n' +
          (order === 'normal-first'
            ? normal + setup
            : setup + (order === 'setup-first' ? normal : ''));
        const program = create(raw, builder);
        const source = await parse(raw, program);
        const typed = services(source);
        expect(typed.program).toBe(program);
        expect(program.getSyntacticDiagnostics()).toEqual([]);
        expect(program.getSemanticDiagnostics()).toEqual([]);
        const parameters = nodes(
          source,
          node => node.type === 'Identifier' && ['T', 'U', 'V'].includes(node.name),
        );
        expect(parameters.length).toBeGreaterThan(6);
        for (const node of parameters) {
          const mapped = typed.esTreeNodeToTSNodeMap.get(node);
          if (mapped) {
            expect(typed.getTypeAtLocation(node).flags & ts.TypeFlags.TypeParameter).toBeTruthy();
            expect(typed.tsNodeToESTreeNodeMap.get(mapped)).toBe(node);
          }
        }
        const assertionMessages = verify(source, assertions);
        // Only the plain string assertion and the inner function's redundant assertion.
        expect(assertionMessages).toHaveLength(2);
        const plain = assertionMessages.find(
          message => message.fix?.range[0] === raw.indexOf(' as string'),
        );
        expect(plain?.fix).toEqual({
          range: [raw.indexOf(' as string'), raw.indexOf(' as string') + ' as string'.length],
          text: '',
        });
        const unionMessages = verify(source, constituents);
        expect(unionMessages).toHaveLength(1);
        expect(unionMessages[0].line).toBe(source.getLocFromIndex(raw.indexOf("'literal'")).line);
        const argumentMessages = verify(source, argumentsRule);
        expect(argumentMessages).toHaveLength(1);
        const argument = raw.indexOf('<unknown>', raw.indexOf('let redundantOption'));
        expect(argumentMessages[0].fix).toEqual({
          range: [argument, argument + '<unknown>'.length],
          text: '',
        });
        const deprecated = verify(source, deprecation);
        expect(deprecated).toHaveLength(1);
        expect(deprecated[0].line).toBe(source.getLocFromIndex(raw.lastIndexOf('oldApi()')).line);
      });
    }
    it(`${builder ? 'builder' : 'standard'}: hoists value imports and preserves JSX and top-level await`, async () => {
      const raw = `<script setup lang="tsx" generic="T extends string">
import { text } from './dep';
const value = text as T;
const node = <div>{value}</div>;
await value;
</script>`;
      const program = create(raw, builder);
      const source = await parse(raw, program);
      const typed = services(source);
      expect(typed.program).toBe(program);
      const text = nodes(source, node => node.type === 'Identifier' && node.name === 'text').at(
        -1,
      )!;
      expect(typed.getTypeAtLocation(text).flags & ts.TypeFlags.String).toBeTruthy();
      expect(verify(source, assertions)).toEqual([]);
      expect(program.getSyntacticDiagnostics()).toEqual([]);
      expect(
        program
          .getSemanticDiagnostics()
          .filter(diagnostic => [1184, 1232, 1308, 1378].includes(diagnostic.code)),
      ).toEqual([]);
    });
    it(`${builder ? 'builder' : 'standard'}: supports unconstrained and dependent generic defaults`, async () => {
      const raw =
        '<script setup lang="ts" generic="T, U = T">declare const value: U; const used: U = value;</script>';
      const program = create(raw, builder);
      const source = await parse(raw, program);
      const typed = services(source);
      for (const node of nodes(source, node => node.type === 'Identifier' && node.name === 'U')) {
        expect(typed.getTypeAtLocation(node).flags & ts.TypeFlags.TypeParameter).toBeTruthy();
      }
      expect(program.getSemanticDiagnostics()).toEqual([]);
    });
    it(`${builder ? 'builder' : 'standard'}: preserves lexical this without introducing an arguments binding`, async () => {
      const raw =
        '<script setup lang="ts" generic="T">const self = this; const args = arguments;</script>';
      const program = create(raw, builder);
      const source = await parse(raw, program);
      const typed = services(source);
      const self = nodes(source, node => node.type === 'ThisExpression')[0];
      expect(typed.getTypeAtLocation(self).flags & ts.TypeFlags.Undefined).toBeTruthy();
      expect(
        program
          .getSemanticDiagnostics()
          .some(
            diagnostic =>
              diagnostic.code === 2304 && String(diagnostic.messageText).includes('arguments'),
          ),
      ).toBe(true);
    });
    it(`${builder ? 'builder' : 'standard'}: keeps real aliases and normal-script bindings outside the generic scope`, async () => {
      const raw = `<script lang="ts">type T = number; const outside: T = 1;</script>
<script setup lang="ts" generic="T extends string">
declare let first: T, second: T;
declare var third: T;
const inside: T = first;
const normal: number = outside;
function shadow() { type T = boolean; const local: T = true; return local; }
</script>`;
      const program = create(raw, builder);
      const source = await parse(raw, program);
      const typed = services(source);
      const typeOf = (name: string) =>
        typed.getTypeAtLocation(
          nodes(source, node => node.type === 'Identifier' && node.name === name).at(-1)!,
        );
      expect(typeOf('inside').flags & ts.TypeFlags.TypeParameter).toBeTruthy();
      expect(typeOf('outside').flags & ts.TypeFlags.Number).toBeTruthy();
      expect(typeOf('local').flags & ts.TypeFlags.BooleanLiteral).toBeTruthy();
      expect(program.getSemanticDiagnostics()).toEqual([]);
    });
  }
  it('rejects typed services when a surviving node cannot be mapped', () => {
    const raw = '<script setup lang="ts" generic="T">const value = 1 as T;</script>';
    const projection = getVueScript(file, raw, true)!;
    const parsed = parsersMap.typescript.parseForESLint(projection.code, { filePath: file });
    const program = create(raw, false);
    const result = applyVueGenericServices(
      parsed,
      { ...projection.generics!, segments: [] },
      program,
      program.getSourceFile(file)!,
    );
    expect(result.services.program).toBeNull();
  });
  for (const declaration of [
    'declare function external(value: T): T;',
    'declare class External { value: T; }',
    'declare const { value }: { value: T };',
    'namespace Local { export type Value = T; }',
  ]) {
    it(`keeps unsupported setup declarations syntax-only: ${declaration}`, async () => {
      const raw = `<script setup lang="ts" generic="T">${declaration}</script>`;
      expect(getVueScript(file, raw, true)?.generics).toBeNull();
      const source = await parse(raw, create(raw, false));
      expect(source.parserServices.program).toBeNull();
      expect(source.ast.body).toHaveLength(1);
    });
  }
  it('invalidates both hosts and rejects a stale Program after a default-only edit', async () => {
    const raw = '<script setup lang="ts" generic="T = string">const value = "a" as T;</script>';
    const changed = raw.replace('T = string', 'T = number');
    const initial = getVueScript(file, raw, true)!;
    const next = getVueScript(file, changed, true)!;
    expect(next.code).toBe(initial.code); // Vue aliases discard defaults.
    expect(next.compilerCode).not.toBe(initial.compilerCode);
    setSourceFilesContext({ [file]: { fileContent: raw } });
    const config = options();
    const firstHost = new IncrementalCompilerHost(config.options, baseDir);
    const first = ts.createSemanticDiagnosticsBuilderProgram(
      config.rootNames,
      config.options,
      firstHost,
    );
    const secondHost = new IncrementalCompilerHost(config.options, baseDir);
    createStandardProgram({ ...config, host: secondHost });
    setSourceFilesContext({ [file]: { fileContent: changed } });
    expect(firstHost.updateFile(file, changed)).toBe(true);
    expect(secondHost.updateFile(file, changed)).toBe(true);
    expect((await parse(changed, first.getProgram())).parserServices.program).toBeNull();
    const updated = ts
      .createSemanticDiagnosticsBuilderProgram(config.rootNames, config.options, firstHost, first)
      .getProgram();
    expect(services(await parse(changed, updated)).program).toBe(updated);
    expect(updated.getSourceFile(file)?.text).toContain('T = number');
  });
  it('reuses template-only edits and refreshes generic constraints when imported types change', async () => {
    const raw =
      '<script setup lang="ts" generic="T extends import(\'./dep\').Text">declare const value: T; value;</script>';
    const changed = raw + '<template>{{ value }}</template>';
    const context = {
      [file]: { fileContent: raw },
      [dependency]: { fileContent: 'export type Text = string;' },
    };
    setSourceFilesContext(context);
    const getProgram = () => createOrGetCachedProgramForFile(baseDir, file, options)!;
    const first = getProgram();
    context[file].fileContent = changed;
    setSourceFilesContext(context);
    expect(getProgram()).toBe(first);
    expect(services(await parse(changed, first)).program).toBe(first);
    context[dependency].fileContent = 'export type Text = number;';
    setSourceFilesContext(context);
    const updated = getProgram();
    expect(updated).not.toBe(first);
    const source = await parse(changed, updated);
    const typed = services(source);
    const value = nodes(source, node => node.type === 'Identifier' && node.name === 'value').at(
      -1,
    )!;
    const type = typed.getTypeAtLocation(value);
    expect(
      updated
        .getTypeChecker()
        .typeToString(updated.getTypeChecker().getBaseConstraintOfType(type)!),
    ).toBe('number');
  });
});
