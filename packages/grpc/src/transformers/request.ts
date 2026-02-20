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
import { analyzer } from '../proto/language_analyzer.js';
import type { ProjectAnalysisInput } from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import { JSTS_ANALYSIS_DEFAULTS } from '../../../jsts/src/analysis/analysis.js';
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import type { FileType } from '../../../shared/src/helpers/files.js';
import { isString } from '../../../shared/src/helpers/sanitize.js';
import type { RuleConfig as CssRuleConfig } from '../../../css/src/linter/config.js';
import { buildRuleConfigurations as buildJstsRuleConfigurations } from './rule-configurations/jsts.js';
import { buildRuleConfigurations as buildCssRuleConfigurations } from './rule-configurations/css.js';

/**
 * Transform source files from gRPC protobuf format to raw input format.
 *
 * The gRPC request contains an array of `ISourceFile` objects with `relativePath`, `content`,
 * and optionally `fileScope`. This function converts them into a dictionary that can be
 * passed to `sanitizeRawInputFiles` for validation and normalization.
 *
 * File scope handling:
 * - If fileScope is explicitly set in the request, use it (MAIN or TEST)
 * - Otherwise, default to 'MAIN' (context-based inference could be added in the future)
 *
 * @param sourceFiles - Array of source files from the gRPC request
 * @returns Dictionary of files to be sanitized before use
 */
export function transformSourceFilesToRawInputFiles(
  sourceFiles: analyzer.ISourceFile[],
): Record<string, Record<string, unknown>> {
  const files: Record<string, Record<string, unknown>> = {};

  for (const sourceFile of sourceFiles) {
    const relativePath = isString(sourceFile.relativePath) ? sourceFile.relativePath : '';
    let fileType: FileType = 'MAIN';

    if (sourceFile.fileScope !== null && sourceFile.fileScope !== undefined) {
      fileType = sourceFile.fileScope === analyzer.FileScope.TEST ? 'TEST' : 'MAIN';
    } else {
      /* TODO: Infer file scope from context when not explicitly provided by the caller
       *   calling filterPathAndGetFileType(filename, getFilterPathParams(configuration)),
       *   but we need configuration from the a3s context
       * */
    }

    files[relativePath] = {
      filePath: relativePath,
      fileContent: isString(sourceFile.content) ? sourceFile.content : '',
      fileType,
      fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
    };
  }

  return files;
}

/**
 * Transform all active rules from gRPC format, separating JS/TS and CSS rules.
 *
 * Iterates through all active rules in a single pass:
 * - JS/TS rules (repo 'javascript'/'typescript') are looked up in ruleMetaMap and
 *   expanded into one RuleConfig per supported language
 * - CSS rules (repo 'css') are mapped from SonarQube keys to stylelint keys via cssRuleMetaMap
 * - Rules with unknown repos are logged and skipped
 *
 * @param activeRules - Array of active rules from the gRPC request
 * @returns Object with `rules` (JS/TS RuleConfig[]) and `cssRules` (CssRuleConfig[])
 */
function transformActiveRules(activeRules: analyzer.IActiveRule[]): {
  rules: RuleConfig[];
  cssRules: CssRuleConfig[];
} {
  const rules: RuleConfig[] = [];
  const cssRules: CssRuleConfig[] = [];

  for (const activeRule of activeRules) {
    const repo = isString(activeRule.ruleKey?.repo) ? activeRule.ruleKey.repo : '';
    const ruleKey = isString(activeRule.ruleKey?.rule) ? activeRule.ruleKey.rule : '';

    switch (repo) {
      case 'css': {
        const cssRuleConfig = buildCssRuleConfigurations(ruleKey, activeRule.params || []);
        if (cssRuleConfig) {
          cssRules.push(cssRuleConfig);
        }
        break;
      }
      case 'javascript':
      case 'typescript': {
        const jstsRuleConfigs = buildJstsRuleConfigurations(ruleKey, activeRule.params || []);
        if (jstsRuleConfigs) {
          rules.push(...jstsRuleConfigs);
        }
        break;
      }
    }
  }

  return { rules, cssRules };
}

/**
 * Transform a gRPC AnalyzeRequest into the ProjectAnalysisInput format.
 *
 * This is the main entry point for request transformation in the gRPC workflow.
 * It converts the protobuf-based request format into the internal format expected
 * by the `analyzeProject` function.
 *
 * **Key differences from SonarQube HTTP workflow:**
 * - gRPC sends file contents inline (no filesystem access needed)
 * - gRPC sends rule params as string key-value pairs (needs type parsing)
 * - SonarQube HTTP sends already-typed configuration objects
 *
 * **Transformation flow:**
 * ```
 * IAnalyzeRequest
 *   ├── sourceFiles[] ──→ transformSourceFilesToRawInputFiles() ──→ sanitizeRawInputFiles() ──→ JsTsFiles
 *   └── activeRules[] ──→ transformActiveRules() ──→ RuleConfig[] (one per rule+language)
 * ```
 *
 * Note: The caller must call `initFileStores(configuration, rawFiles)` before calling
 * `analyzeProject`. The `analyzeProject` function retrieves files from the file store internally.
 *
 * @param request - The gRPC AnalyzeRequest containing source files and active rules
 * @returns ProjectAnalysisInput ready to pass to analyzeProject()
 *
 * @see docs/DEV.md "External workflow (gRPC - without SonarQube)" section
 */
export function transformRequestToProjectInput(
  request: analyzer.IAnalyzeRequest,
): ProjectAnalysisInput {
  const { rules, cssRules } = transformActiveRules(request.activeRules || []);

  return {
    rules,
    cssRules,
    bundles: [],
    rulesWorkdir: undefined,
  };
}
