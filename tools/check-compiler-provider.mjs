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
// Build-time declaration validation uses the reference compiler explicitly.
import ts from 'typescript-classic';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import selectProvider from '../packages/typescript/selection.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const selected = selectProvider();
const filename = path
  .join(root, 'packages/typescript/provider-contract-check.mts')
  .replaceAll('\\', '/');
const text = `import provider from ${JSON.stringify(selected.source ?? selected.module)};
import type { Provider } from './contract.cjs';
const implementation: Provider = provider;
void implementation;
`;
const options = {
  noEmit: true,
  allowJs: true,
  checkJs: false,
  strict: true,
  skipLibCheck: false,
  resolveJsonModule: true,
  esModuleInterop: true,
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.esnext.d.ts'],
  types: ['node'],
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
};
const host = ts.createCompilerHost(options);
const sourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (file, languageVersion, onError, fresh) =>
  file === filename
    ? ts.createSourceFile(file, text, languageVersion, true)
    : sourceFile(file, languageVersion, onError, fresh);
const program = ts.createProgram([filename], options, host);
// SDK source archives may have separate workspace-only type dependencies. Infer
// their exported types, but check diagnostics at our provider/contract boundary.
const errors = ts
  .getPreEmitDiagnostics(program)
  .filter(
    diagnostic =>
      !diagnostic.file ||
      !diagnostic.file.fileName.replaceAll('\\', '/').includes('/node_modules/'),
  );
if (errors.length) {
  process.stderr.write(
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }),
  );
  process.exitCode = 1;
}
