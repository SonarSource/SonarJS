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
import type { RuleConfig } from '../../../jsts/src/linter/config/rule-config.js';
import type { FileType } from '../../../shared/src/helpers/files.js';
import type { JsTsLanguage } from '../../../shared/src/helpers/configuration.js';
import type { AnalysisMode } from '../../../jsts/src/analysis/analysis.js';

export interface InitLinterInput {
  rules: RuleConfig[];
  environments: string[];
  globals: string[];
  baseDir: string;
  sonarlint: boolean;
  bundles: string[];
  rulesWorkdir: string;
}

/**
 * Transform gRPC InitLinterRequest to internal InitLinterInput format.
 *
 * Converts the protobuf request into the format expected by Linter.initialize().
 * Parses JSON-encoded configurations back into objects.
 */
export function transformInitLinterRequest(request: bridge.IInitLinterRequest): InitLinterInput {
  return {
    rules: (request.rules || []).map(rule => ({
      key: rule.key || '',
      fileTypeTargets: (rule.fileTypeTargets || []) as FileType[],
      configurations: (rule.configurations || []).map(c => {
        try {
          return JSON.parse(c);
        } catch {
          return c;
        }
      }),
      analysisModes: (rule.analysisModes || ['DEFAULT']) as AnalysisMode[],
      blacklistedExtensions: rule.blacklistedExtensions || [],
      language: (rule.language || 'js') as JsTsLanguage,
    })),
    environments: request.environments || [],
    globals: request.globals || [],
    baseDir: request.baseDir || '',
    sonarlint: request.sonarlint || false,
    bundles: request.bundles || [],
    rulesWorkdir: request.rulesWorkdir || '',
  };
}
