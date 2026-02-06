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

/**
 * Post-processes the test execution report for SonarQube compatibility:
 * - Transforms paths from compiled JS (lib/) to source TS (packages/)
 * - Filters out non-test files (SonarQube only accepts files matching sonar.test.inclusions)
 *
 * Some test helpers (e.g., comment-based/checker.ts) call `it()` from node:test directly,
 * causing the test runner to report them as the file. These must be excluded since
 * SonarQube expects only *.test.ts files in the report.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const reportPath = process.argv[2] || 'coverage/js/test-report.xml';

const content = readFileSync(reportPath, 'utf-8');
const transformed = content
  .replace(/path="lib[/\\]/g, 'path="packages/')
  .replace(/\.test\.js"/g, '.test.ts"')
  .replace(/\\/g, '/'); // Normalize to forward slashes

// Remove <file> entries that don't match *.test.ts (sonar.test.inclusions pattern).
// These come from test helpers that call it() from node:test directly.
const filtered = transformed.replace(
  /\t<file path="[^"]*(?<!\.test\.ts)">\n(?:\t\t<testCase [^>]*\/>\n)*\t<\/file>\n/g,
  '',
);

writeFileSync(reportPath, filtered);

console.log(`Transformed test report paths in ${reportPath}`);
