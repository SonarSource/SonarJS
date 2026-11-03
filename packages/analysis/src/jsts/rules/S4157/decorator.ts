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
import type { Rule } from 'eslint';
import type { AST } from 'vue-eslint-parser';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, rule.meta),
    create(context) {
      const document: AST.VDocumentFragment | undefined =
        context.sourceCode.parserServices.getDocumentFragment?.();
      const hasVueGenerics = document?.children.some(
        child =>
          child.type === 'VElement' &&
          child.name === 'script' &&
          child.variables.some(variable => variable.kind === 'generic'),
      );
      // vue-eslint-parser represents generics as aliases of their constraints. Until
      // their actual semantics are preserved, skip S4157 for the whole component,
      // including genuinely redundant arguments, to avoid incorrect removal fixes.
      return hasVueGenerics ? {} : rule.create(context);
    },
  };
}
