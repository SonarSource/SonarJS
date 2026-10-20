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
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { testProject } from '../../packages/ruling/testProject.js';
const [project, baseDir, output] = process.argv.slice(2);
let payload: unknown;
await testProject(project, {
  baseDir,
  onAnalysis(results, analysisMs) {
    const files = Object.entries(results.files).map(([file, result]) => ({
      file: path.relative(baseDir, file),
      ...('error' in result
        ? { error: result.error }
        : {
            issues: result.issues,
            parsingErrors: result.parsingErrors ?? [],
          }),
    }));
    payload = {
      backend: process.env.SONARJS_TYPESCRIPT_BACKEND,
      project,
      baseDir,
      analysisMs,
      files,
      memory: process.memoryUsage(),
      peakRssBytes: process.resourceUsage().maxRSS * 1024,
    };
  },
});

await writeFile(output, JSON.stringify(payload, null, 2));
