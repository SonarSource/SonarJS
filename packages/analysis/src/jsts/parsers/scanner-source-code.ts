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
import type { AST as EslintAST, SourceCode } from 'eslint';
import { SourceCode as EslintSourceCode } from 'eslint';
import type { Comment, Node } from 'estree';
import type { AST as VueAST } from 'vue-eslint-parser';
import { visit } from '../ast/visit.js';

const ECMASCRIPT_ONLY_LINE_TERMINATORS = /[\u2028\u2029]/u;
const ECMASCRIPT_ONLY_LINE_TERMINATORS_GLOBAL = /[\u2028\u2029]/gu;

type Locatable = Node | Comment | EslintAST.Token | VueAST.Token;

/**
 * Aligns ESLint locations with the scanner's physical line model.
 *
 * ECMAScript treats U+2028 and U+2029 as line terminators, while scanner-engine only treats CR and
 * LF as line endings. A coordinate-only copy replaces the two extra terminators with spaces, which
 * preserves every UTF-16 offset. The AST is parsed from the original source first, so its values
 * and ranges remain authoritative for analysis semantics.
 */
export function alignSourceCodeWithScanner(sourceCode: SourceCode): SourceCode {
  if (!ECMASCRIPT_ONLY_LINE_TERMINATORS.test(sourceCode.text)) {
    return sourceCode;
  }

  const coordinateText = sourceCode.text.replaceAll(ECMASCRIPT_ONLY_LINE_TERMINATORS_GLOBAL, ' ');
  const coordinateSourceCode = new EslintSourceCode({
    text: coordinateText,
    ast: sourceCode.ast,
    parserServices: sourceCode.parserServices,
    scopeManager: sourceCode.scopeManager,
    visitorKeys: sourceCode.visitorKeys,
  });
  patchLocations(coordinateSourceCode);
  return coordinateSourceCode;
}

function patchLocations(sourceCode: SourceCode) {
  visit(sourceCode, patchLocation);
  sourceCode.ast.comments.forEach(patchLocation);
  sourceCode.ast.tokens?.forEach(patchLocation);

  const templateBody = (sourceCode.ast as VueAST.ESLintProgram).templateBody;
  templateBody?.comments.forEach(patchLocation);
  templateBody?.tokens.forEach(patchLocation);

  function patchLocation(node: Locatable) {
    if (node.loc != null && node.range != null) {
      node.loc = {
        start: sourceCode.getLocFromIndex(node.range[0]),
        end: sourceCode.getLocFromIndex(node.range[1]),
      };
    }
  }
}
