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
import type PostCSS from 'postcss';

// Keywords that every property accepts, which defer the value to the cascade
export const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'revert', 'revert-layer', 'unset']);

/**
 * The index of the value from the start of the declaration, as `stylelint.utils.report()` expects.
 */
export function declarationValueIndex(decl: PostCSS.Declaration): number {
  return decl.prop.length + (decl.raws.between ?? ':').length;
}
