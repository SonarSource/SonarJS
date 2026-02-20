/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { LinterOptions } from 'stylelint';
import postcss, { type Root } from 'postcss';
import postcssScss from 'postcss-scss';
import postcssSass from 'postcss-sass';
import postcssLess from 'postcss-less';
import type { CssAnalysisInput, CssAnalysisOutput } from './analysis.js';
import { linter } from '../linter/wrapper.js';
import { createStylelintConfig } from '../linter/config.js';
import { computeMetrics } from './metrics.js';
import { computeHighlighting } from './highlighting.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { error, warn } from '../../../shared/src/helpers/logging.js';
import {
  shouldIgnoreFile,
  type ShouldIgnoreFileParams,
} from '../../../shared/src/helpers/filter/filter.js';

/**
 * Analyzes a CSS analysis input
 *
 * Analyzing a CSS analysis input is rather straighforward. All that is needed
 * is to create a Stylelint configuration based on the rules from the active
 * quality profile and uses this configuration to linter the input file.
 *
 * The input must be fully sanitized (all fields required) before calling this function.
 *
 * When `input.rules` is provided (bridge per-request path), a fresh Stylelint
 * config is created from them. When absent (analyzeProject path), the linter's
 * pre-initialized config is used instead (see `LinterWrapper.initialize()`).
 *
 * @param input the sanitized CSS analysis input to analyze
 * @param shouldIgnoreParams parameters needed to determine whether a file should be ignored
 * @returns a promise of the CSS analysis output
 */
export async function analyzeCSS(
  input: CssAnalysisInput,
  shouldIgnoreParams: ShouldIgnoreFileParams,
): Promise<CssAnalysisOutput> {
  const { filePath, fileContent, rules } = input;
  if (await shouldIgnoreFile({ filePath, fileContent }, shouldIgnoreParams)) {
    return { issues: [] };
  }

  // If rules are provided explicitly (bridge path), create a fresh config.
  // Otherwise, use the linter's pre-initialized config (analyzeProject path).
  const config = rules ? createStylelintConfig(rules) : undefined;

  const sanitizedCode = fileContent.replaceAll(/[\u2000-\u200F]/g, ' ');

  const options: LinterOptions = {
    code: sanitizedCode,
    codeFilename: filePath,
    ...(config && { config }),
  };

  const { issues } = await linter.lint(filePath, options).catch(err => {
    error(`Linter failed to parse file ${filePath}: ${err}`);
    throw APIError.linterError(`Linter failed to parse file ${filePath}: ${err}`);
  });

  // Skip metrics and highlighting in SonarLint mode
  if (input.sonarlint) {
    return { issues };
  }

  try {
    const root = parseWithPostCSS(sanitizedCode, filePath);
    return {
      issues,
      highlights: computeHighlighting(root, sanitizedCode),
      metrics: computeMetrics(root),
    };
  } catch (err) {
    warn(`Failed to compute metrics/highlighting for ${filePath}: ${err}`);
    return { issues };
  }
}

/**
 * Parses CSS source code using PostCSS with the appropriate syntax
 * plugin based on the file extension.
 */
function parseWithPostCSS(code: string, filePath: string): Root {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const syntax =
    ext === 'scss'
      ? postcssScss
      : ext === 'sass'
        ? postcssSass
        : ext === 'less'
          ? postcssLess
          : undefined;
  return postcss().process(code, { from: filePath, ...(syntax && { syntax }) }).root;
}
