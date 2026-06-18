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
  maxProjects = '',
}) {
  const projects = await loadPeacheeProjects(peacheeRoot);
  const projectNames = limitProjects(
    selectEnabledPeacheeProjects(projects, projectFilter),
    maxProjects,
  );
  const matrix = buildPeacheeShardMatrix(projectNames, projectsPerShard);
  await writeJsonFile(outputPath, matrix);
  return matrix;
}

function limitProjects(projectNames, maxProjects) {
  if (maxProjects === '' || maxProjects === null || maxProjects === undefined) {
    return projectNames;
  }
  const limit = Number(maxProjects);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`maxProjects must be a positive integer: ${maxProjects}`);
  }
  return projectNames.slice(0, limit);
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const matrix = await renderPeacheeShardMatrix({
    peacheeRoot: resolve(requireOption(args, '--peachee-root')),
    outputPath: resolvePathUnder(cwd, requireOption(args, '--output'), '--output'),
    projectFilter: args.get('--project-filter') ?? '',
    projectsPerShard: args.get('--projects-per-shard') ?? '16',
    maxProjects: args.get('--max-projects') ?? '',
  });
  const selectedProjects = matrix.include.flatMap(shard => shard.projects);
  console.log(
    `Selected peachee projects (${selectedProjects.length}): ${selectedProjects.join(', ')}`,
  );
  console.log(`Wrote peachee shard matrix (${matrix.include.length} shard(s))`);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
