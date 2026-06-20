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
import type stylelint from 'stylelint';
import type PostCSS from 'postcss';
import { debug, warn } from '../../../../../shared/src/helpers/logging.js';
import type { CssIssue } from './issue.js';
import type { NormalizedAbsolutePath } from '../../../../../shared/src/helpers/files.js';
import { cssOnlyRuleKeys } from '../css-only-rules.js';

const NON_CSS_LANGS = new Set(['scss', 'sass', 'less', 'stylus', 'styl']);

type EmbeddedBlockSource = PostCSS.Source & { lang?: string };

/**
 * Checks if a position value (line or column) is valid.
 * Stylelint may return null/NaN for certain edge cases (e.g., empty SASS blocks in Vue files).
 */
function isValidPosition(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

function getEmbeddedBlockLang(source: PostCSS.Source | undefined): string | undefined {
  if (!source || !('lang' in source) || typeof source.lang !== 'string') {
    return undefined;
  }
  return source.lang.toLowerCase();
}

/**
 * Returns true when a warning position falls within an embedded block range.
 *
 * We require a fully known source range. Missing start/end positions are treated
 * conservatively as "no match" to avoid suppressing unrelated CSS warnings.
 */
function isWithinSourceRange(
  warning: Pick<stylelint.Warning, 'line' | 'column'>,
  source: EmbeddedBlockSource | undefined,
): boolean {
  const warningLine = warning.line;
  const warningColumn = warning.column;
  const startLine = source?.start?.line;
  const startColumn = source?.start?.column;
  const endLine = source?.end?.line;
  const endColumn = source?.end?.column;

  if (
    !isValidPosition(warningLine) ||
    !isValidPosition(warningColumn) ||
    !isValidPosition(startLine) ||
    !isValidPosition(startColumn) ||
    !isValidPosition(endLine) ||
    !isValidPosition(endColumn)
  ) {
    return false;
  }

  if (warningLine < startLine || warningLine > endLine) {
    return false;
  }

  if (warningLine === startLine && warningColumn < startColumn) {
    return false;
  }

  if (warningLine === endLine && warningColumn > endColumn) {
    return false;
  }

  return true;
}

/**
 * Returns true when a CSS-only rule warning came from a non-CSS embedded block
 * inside an HTML or Vue file (e.g. <style lang="scss">).
 *
 * When postcss-html parses an HTML/Vue file it produces a PostCSS Document whose
 * child Root nodes each carry a `source.lang` from the block's lang attribute.
 * We use that to decide whether to suppress the warning.
 */
function isInNonCssEmbeddedBlock(
  warning: stylelint.Warning,
  result: stylelint.LintResult,
): boolean {
  const root = (result as { _postcssResult?: { root?: unknown } })._postcssResult?.root as
    | PostCSS.Root
    | PostCSS.Document
    | undefined;

  if (root?.type !== 'document') {
    return false;
  }

  for (const child of root.nodes) {
    if (child.type !== 'root') {
      continue;
    }
    const source = child.source;
    const lang = getEmbeddedBlockLang(source);
    if (!lang || !NON_CSS_LANGS.has(lang)) {
      continue;
    }
    if (isWithinSourceRange(warning, source)) {
      return true;
    }
  }
  return false;
}

/**
 * Transforms Stylelint linting results into SonarQube issues
 * @param results the Stylelint linting results
 * @param filePath the path of the linted file
 * @returns the transformed SonarQube issues
 */
export function transform(
  results: stylelint.LintResult[],
  filePath: NormalizedAbsolutePath,
): CssIssue[] {
  const issues: CssIssue[] = [];
  /**
   * There should be only one element in 'results' as we are analyzing
   * only one file at a time.
   */
  for (const result of results) {
    /** Avoids reporting on "fake" source like <input css 1>  */
    if (result.source !== filePath) {
      debug(
        `For file [${filePath}] received issues with [${result.source}] as a source. They will not be reported.`,
      );
      continue;
    }
    for (const warning of result.warnings) {
      // CSS-only rules must not report on non-CSS embedded blocks (e.g. <style lang="scss">).
      if (cssOnlyRuleKeys.has(warning.rule) && isInNonCssEmbeddedBlock(warning, result)) {
        continue;
      }

      const line = isValidPosition(warning.line) ? warning.line : 1;
      // Stylelint columns are 1-based; SonarQube expects 0-based
      const column = isValidPosition(warning.column) ? warning.column - 1 : 0;

      if (!isValidPosition(warning.line) || !isValidPosition(warning.column)) {
        warn(
          `Invalid position for rule ${warning.rule} in ${filePath}: ` +
            `line=${warning.line}, column=${warning.column}. Defaulting to line=${line}, column=${column}.`,
        );
      }

      const issue: CssIssue = {
        ruleId: warning.rule,
        line,
        column,
        message: normalizeMessage(warning.text),
        language: 'css',
      };

      // no-empty-source fires on empty files; stylelint reports endColumn: 2
      // which would be invalid (line has 0 chars), so skip end positions.
      if (
        warning.rule !== 'no-empty-source' &&
        isValidPosition(warning.endLine) &&
        isValidPosition(warning.endColumn)
      ) {
        issue.endLine = warning.endLine;
        issue.endColumn = warning.endColumn - 1;
      }

      issues.push(issue);
    }
  }
  return issues;
}

/**
 * Strips the trailing `(rulekey)` suffix from Stylelint messages.
 * Stylelint formats messages as "Description text (rule-name)".
 * SonarQube only needs the description.
 */
function normalizeMessage(message: string): string {
  return message.replace(/\([a-zA-Z/@-]+\)$/, '').trim();
}
