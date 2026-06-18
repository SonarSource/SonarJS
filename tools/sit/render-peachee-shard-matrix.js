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
import { resolve } from 'node:path';
import {
  isMain,
  parseOptionArgs,
  requireOption,
  resolvePathUnder,
  writeJsonFile,
} from './common.js';
import {
  buildPeacheeShardMatrix,
  loadPeacheeProjects,
  selectEnabledPeacheeProjects,
} from './peachee-projects.js';

export async function renderPeacheeShardMatrix({
  peacheeRoot,
  outputPath,
  projectFilter = '',
  projectsPerShard = 16,
}) {
  const projects = await loadPeacheeProjects(peacheeRoot);
  const projectNames = selectEnabledPeacheeProjects(projects, projectFilter);
  const matrix = buildPeacheeShardMatrix(projectNames, projectsPerShard);
  await writeJsonFile(outputPath, matrix);
  return matrix;
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const matrix = await renderPeacheeShardMatrix({
    peacheeRoot: resolve(requireOption(args, '--peachee-root')),
    outputPath: resolvePathUnder(cwd, requireOption(args, '--output'), '--output'),
    projectFilter: args.get('--project-filter') ?? '',
    projectsPerShard: args.get('--projects-per-shard') ?? '16',
  });
  console.log(`Wrote peachee shard matrix (${matrix.include.length} shard(s))`);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
