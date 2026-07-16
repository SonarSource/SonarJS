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
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { header, writePrettyFile, RULES_FOLDER } from './helpers.js';

/**
 * Generate packages/analysis/src/jsts/rules/helpers/generated-secret-patterns.ts with the
 * secret-exclusion patterns from the SecretClassifier in sonar-analyzer-commons, published for
 * non-JVM analyzers as secret-patterns.json in @sonarsource/analyzer-commons-configurations.
 */

type PatternGroup = { category: string; patterns: string[] };
type ExactMatchGroup = { category: string; values: string[] };
type SecretPatterns = { patternGroups: PatternGroup[]; exactMatchGroups: ExactMatchGroup[] };

const secretPatternsUrl = import.meta.resolve(
  '@sonarsource/analyzer-commons-configurations/secret-patterns.json',
);
const { patternGroups, exactMatchGroups }: SecretPatterns = JSON.parse(
  await readFile(fileURLToPath(secretPatternsUrl), 'utf8'),
);

const dest = join(RULES_FOLDER, 'helpers', 'generated-secret-patterns.ts');

await writePrettyFile(
  dest,
  `${header}
// Generated from @sonarsource/analyzer-commons-configurations's secret-patterns.json. Do not edit manually.

export const patternGroups: { category: string; patterns: string[] }[] = ${JSON.stringify(patternGroups)};

export const exactMatchGroups: { category: string; values: string[] }[] = ${JSON.stringify(exactMatchGroups)};
`,
);
