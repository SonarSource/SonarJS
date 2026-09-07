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
/**
 * An extracted embedded JavaScript code snippet
 *
 * @param code JS code
 * @param line Line where JS code starts
 * @param column Column where JS code starts
 * @param offset Offset where JS code starts
 * @param lineStarts Offset at each line start for the whole file
 * @param text Whole file content
 * @param format Format of the string that embeds the JS code
 * @param extras Additional data, filled by ExtrasPicker
 */
export type EmbeddedJS = {
  code: string;
  line: number;
  column: number;
  offset: number;
  lineStarts: number[];
  text: string;
  format: 'PLAIN' | 'BLOCK_FOLDED' | 'BLOCK_LITERAL';
  extras: {
    resourceName?: string;
    /**
     * For a snippet extracted from an inline HTML `<script>` block, the kind of script it is.
     * Left undefined for snippets extracted from other host formats (YAML, ...).
     *
     * All classic (non-module) `<script>` blocks of the same HTML document share one global
     * lexical/variable environment, so their top-level declarations are visible to each other.
     * A module block has its own isolated module scope: it contributes nothing to that shared
     * environment, but its free identifiers still resolve through it.
     *
     * `defer` has no effect on an inline script (it only applies to scripts with a `src`
     * attribute, which are not extracted at all), so it never affects this classification.
     * `async` is ignored on an inline classic script too, but it *is* honoured on an inline
     * module one, which then evaluates as soon as it is ready instead of being deferred until
     * the document has been parsed. `asyncModule` distinguishes that case, since such a block can
     * run before the classic blocks that follow it.
     */
    scriptKind?: 'classic' | 'module' | 'asyncModule';
  };
};
