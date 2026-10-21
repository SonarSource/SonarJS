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
import shared from '../../compat/index.cjs';
import { Resolver } from 'tsc-ts-source/packages/tsc-ts/src/compiler/module-resolution.ts';
import { compilerOptionsFromApi } from 'tsc-ts-source/packages/tsc-ts/src/library/options.ts';
import * as scanner from 'tsc-ts-source/packages/tsc-ts/src/compiler/scanner.ts';
import { getNormalizedAbsolutePath } from 'tsc-ts-source/packages/tsc-ts/src/compiler/path.ts';
import { SyntaxKind as NativeKind } from 'tsc-ts-source/packages/tsc-ts/src/library/index.ts';
import { sys, getDefaultLibFilePath } from './filesystem.mjs';
const kind = value => shared.SyntaxKind[NativeKind[value]];
function visitComments(ranges, visitor, state) {
  for (const comment of ranges ?? []) {
    const result = visitor(
      comment.pos,
      comment.end,
      kind(comment.kind),
      comment.hasTrailingNewLine,
      state,
    );
    if (result) return result;
  }
  return undefined;
}
function resolverHost(host) {
  const callbacks = { ...sys, ...host };
  return {
    ...callbacks,
    getCurrentDirectory: () => callbacks.getCurrentDirectory?.() ?? sys.getCurrentDirectory(),
    useCaseSensitiveFileNames: () =>
      typeof callbacks.useCaseSensitiveFileNames === 'function'
        ? callbacks.useCaseSensitiveFileNames()
        : callbacks.useCaseSensitiveFileNames,
  };
}
export default {
  ...shared,
  sys,
  getDefaultLibFilePath,
  getNormalizedAbsolutePath,
  getShebang: text => scanner.getShebang(text) || undefined,
  identifierToKeywordKind: node => {
    const value = scanner.identifierToKeywordKind(node.text);
    return value === NativeKind.Unknown ? undefined : kind(value);
  },
  tokenToString: token => scanner.tokenToString(NativeKind[shared.SyntaxKind[token]]) || undefined,
  isIdentifierStart: code => /[$_\p{ID_Start}]/u.test(String.fromCodePoint(code)),
  isIdentifierPart: code => /[$_\u200c\u200d\p{ID_Continue}]/u.test(String.fromCodePoint(code)),
  forEachLeadingCommentRange: (text, pos, visitor, state) =>
    visitComments(scanner.getLeadingCommentRanges(text, pos), visitor, state),
  forEachTrailingCommentRange: (text, pos, visitor, state) =>
    visitComments(scanner.getTrailingCommentRanges(text, pos), visitor, state),
  resolveModuleName: (name, file, options, host) => {
    const resolved = new Resolver(
      resolverHost(host),
      compilerOptionsFromApi(options),
    ).resolveModuleName(name, file, shared.ModuleKind.CommonJS);
    return { resolvedModule: resolved.resolvedFileName ? resolved : undefined };
  },
};
