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
import type { bridge } from '../proto/bridge.js';
import type { Configuration } from '../../../shared/src/helpers/configuration.js';
import type { AnalysisMode } from '../../../jsts/src/analysis/analysis.js';

/**
 * Transform gRPC ProjectAnalysisConfiguration to internal Configuration format.
 */
export function transformProjectConfiguration(
  config: bridge.IProjectAnalysisConfiguration,
): Configuration {
  return {
    baseDir: config.baseDir || '',
    sonarlint: config.sonarlint || false,
    fsEvents: transformFsEvents(config.fsEvents),
    allowTsParserJsFiles: config.allowTsParserJsFiles || false,
    analysisMode: (config.analysisMode || 'DEFAULT') as AnalysisMode,
    skipAst: config.skipAst || false,
    ignoreHeaderComments: config.ignoreHeaderComments || false,
    maxFileSize: typeof config.maxFileSize === 'number' ? config.maxFileSize : 0,
    environments: config.environments || [],
    globals: config.globals || [],
    tsSuffixes: config.tsSuffixes || [],
    jsSuffixes: config.jsSuffixes || [],
    cssSuffixes: config.cssSuffixes || [],
    tsConfigPaths: config.tsConfigPaths || [],
    jsTsExclusions: config.jsTsExclusions || [],
    sources: config.sources || [],
    inclusions: config.inclusions || [],
    exclusions: config.exclusions || [],
    tests: config.tests || [],
    testInclusions: config.testInclusions || [],
    testExclusions: config.testExclusions || [],
    detectBundles: config.detectBundles !== false,
    canAccessFileSystem: config.canAccessFileSystem !== false,
  };
}

/**
 * Transform fs events map from protobuf format.
 * The keys are file paths, values are event types (CREATED, MODIFIED, DELETED).
 */
function transformFsEvents(
  fsEvents: { [key: string]: string } | null | undefined,
): { [key: string]: 'CREATED' | 'MODIFIED' | 'DELETED' } | undefined {
  if (!fsEvents) {
    return undefined;
  }
  const result: { [key: string]: 'CREATED' | 'MODIFIED' | 'DELETED' } = {};
  for (const [key, value] of Object.entries(fsEvents)) {
    if (value === 'CREATED' || value === 'MODIFIED' || value === 'DELETED') {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
