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
import type { RuleFilter } from './rule-filter.js';

export const filterEcmaVersion: RuleFilter = (_config, meta, ctx) => {
  if (ctx.detectedEsYear == null || !meta) {
    return true;
  }
  const required = meta.requiredEcmaVersion;
  if (required == null) {
    return true;
  }
  // On TypeScript the detected ES year is derived from the compiler target/lib, which
  // describes emitted syntax. TypeScript downlevels newer syntax, so rules promoting
  // downlevelable syntax must not be gated by it.
  if (meta.downlevelableSyntax && ctx.fileLanguage === 'ts') {
    return true;
  }
  return required <= ctx.detectedEsYear;
};
