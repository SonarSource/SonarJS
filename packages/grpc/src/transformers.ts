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
import type { analyzer } from './proto/language_analyzer.js';
import type {
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  JsTsFiles,
} from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import type { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';
import type { FileType } from '../../shared/src/helpers/files.js';
import type { Issue } from '../../jsts/src/linter/issues/issue.js';
import type { ESLintConfiguration } from '../../jsts/src/rules/helpers/configs.js';
import * as metas from '../../jsts/src/rules/metas.js';

type RuleMeta = {
  sonarKey: string;
  scope: 'Main' | 'Tests';
  languages: ('js' | 'ts')[];
  fields?: ESLintConfiguration;
};

// A field definition from config.ts
type FieldDef = {
  field: string;
  displayName?: string;
  default: unknown;
};

// Build a lookup map from sonarKey to rule metadata
const ruleMetaMap: Map<string, RuleMeta> = new Map();
for (const [, ruleMeta] of Object.entries(metas)) {
  const meta = ruleMeta as RuleMeta;
  if (meta.sonarKey) {
    ruleMetaMap.set(meta.sonarKey, meta);
  }
}

/**
 * Parse a param value based on the expected type from field default
 */
function parseParamValue(value: string, defaultValue: unknown): unknown {
  if (typeof defaultValue === 'number') {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }
  if (typeof defaultValue === 'boolean') {
    return value === 'true';
  }
  if (Array.isArray(defaultValue)) {
    // Split comma-separated values, preserving element type from default
    const parts = value.split(',').map(v => v.trim());
    // Check first element of default to determine array element type
    if (defaultValue.length > 0 && typeof defaultValue[0] === 'number') {
      return parts.map(p => Number(p)).filter(n => !isNaN(n));
    }
    return parts;
  }
  // Default to string
  return value;
}

/**
 * Build a lookup from SonarQube param key to field definition
 * SQ key is either displayName (if set) or field name
 */
function buildParamKeyMap(fields: ESLintConfiguration): Map<string, FieldDef> {
  const map = new Map<string, FieldDef>();

  for (const element of fields) {
    if (Array.isArray(element)) {
      // Array of named properties (object configuration)
      for (const prop of element) {
        const fieldDef = prop as FieldDef;
        // SQ key is displayName if present, otherwise field name
        const sqKey = fieldDef.displayName ?? fieldDef.field;
        map.set(sqKey, fieldDef);
      }
    }
    // Non-array elements (primitive configs) don't have named keys
  }

  return map;
}

/**
 * Transform a gRPC AnalyzeFileRequest into the analyzeProject input format
 */
export function transformRequestToProjectInput(
  request: analyzer.IAnalyzeFileRequest,
): ProjectAnalysisInput {
  // Handle empty/undefined arrays from proto3
  const sourceFiles = request.sourceFiles || [];
  const activeRules = request.activeRules || [];

  // Transform source files to JsTsFiles format
  const files: JsTsFiles = {};

  for (const sourceFile of sourceFiles) {
    const relativePath = sourceFile.relativePath ?? '';
    files[relativePath] = {
      filePath: relativePath,
      fileContent: sourceFile.content ?? '',
      fileType: 'MAIN', // Default to MAIN, we will need metadata from context to know for sure
    };
  }

  // Transform active rules to RuleConfig format using rule metadata
  const rules: RuleConfig[] = [];
  for (const activeRule of activeRules) {
    const ruleKey = activeRule.ruleKey ?? '';
    const ruleMeta = ruleMetaMap.get(ruleKey);

    if (!ruleMeta) {
      // Unknown rule - skip it
      continue;
    }

    // Build configurations from params using fields mapping
    const configurations: unknown[] = [];
    const params = activeRule.params || [];

    if (params.length > 0 && ruleMeta.fields?.length) {
      // Build lookup from SQ param key to field definition
      const paramKeyMap = buildParamKeyMap(ruleMeta.fields);

      if (paramKeyMap.size > 0) {
        // Object-style configuration
        const paramsObj: Record<string, unknown> = {};

        for (const param of params) {
          const sqKey = param.key ?? '';
          const fieldDef = paramKeyMap.get(sqKey);

          if (fieldDef) {
            // Map SQ key to ESLint field name and parse value
            paramsObj[fieldDef.field] = parseParamValue(param.value ?? '', fieldDef.default);
          }
        }

        if (Object.keys(paramsObj).length > 0) {
          configurations.push(paramsObj);
        }
      } else {
        // Primitive configuration (non-array element in fields)
        const firstField = ruleMeta.fields[0];
        if (firstField && !Array.isArray(firstField) && params[0]) {
          configurations.push(parseParamValue(params[0].value ?? '', firstField.default));
        }
      }
    }

    // Determine file type targets from scope
    const fileTypeTargets: FileType[] = ruleMeta.scope === 'Tests' ? ['TEST'] : ['MAIN', 'TEST'];

    // Create rule config for each supported language
    for (const language of ruleMeta.languages) {
      rules.push({
        key: ruleKey,
        configurations,
        fileTypeTargets,
        language,
        analysisModes: ['DEFAULT'],
      });
    }
  }

  return {
    files,
    rules,
    configuration: {
      // baseDir is irrelevant since we don't access the filesystem
      baseDir: '/',
      // gRPC requests contain all file contents inline - no filesystem access needed
      canAccessFileSystem: false,
    },
  };
}

const PARSING_ERROR_RULE_KEY = 'S2260';

/**
 * Transform analyzeProject output into a gRPC AnalyzeFileResponse
 */
export function transformProjectOutputToResponse(
  output: ProjectAnalysisOutput,
): analyzer.IAnalyzeFileResponse {
  const issues: analyzer.IIssue[] = [];
  const analysisProblems: string[] = [...output.meta.warnings];

  // Process each file result
  for (const [filePath, fileResult] of Object.entries(output.files)) {
    if ('error' in fileResult) {
      analysisProblems.push(`Error analyzing ${filePath}: ${fileResult.error}`);
      continue;
    }

    if ('parsingError' in fileResult) {
      // Report parsing errors as issues with rule S2260
      const { message, line } = fileResult.parsingError;
      issues.push(
        transformIssue({
          ruleId: PARSING_ERROR_RULE_KEY,
          message,
          line: line ?? 1,
          column: 0,
          language: 'js',
          secondaryLocations: [],
          ruleESLintKeys: [],
          filePath,
        }),
      );
      continue;
    }

    // Extract issues from successful analysis
    if ('issues' in fileResult) {
      for (const issue of fileResult.issues) {
        issues.push(transformIssue(issue));
      }
    }
  }

  return {
    issues,
    analysisProblems,
  };
}

/**
 * Transform a single Issue to analyzer.IIssue format
 */
function transformIssue(issue: Issue): analyzer.IIssue {
  const textRange: analyzer.ITextRange = {
    startLine: issue.line,
    endLine: issue.endLine ?? issue.line,
    startOffset: issue.column,
    endOffset: issue.endColumn ?? issue.column,
  };

  // Transform secondary locations into flows
  const flows: analyzer.IFlow[] = [];
  if (issue.secondaryLocations && issue.secondaryLocations.length > 0) {
    // Group secondary locations into a single flow
    const locations: analyzer.IFlowLocation[] = issue.secondaryLocations.map(loc => ({
      textRange: {
        startLine: loc.line,
        endLine: loc.endLine,
        startOffset: loc.column,
        endOffset: loc.endColumn,
      },
      message: loc.message ?? '',
      file: issue.filePath,
    }));

    flows.push({ locations });
  }

  return {
    id: `${issue.ruleId}:${issue.filePath}:${issue.line}:${issue.column}`,
    filePath: issue.filePath,
    message: issue.message,
    rule: issue.ruleId,
    textRange,
    flows,
  };
}
