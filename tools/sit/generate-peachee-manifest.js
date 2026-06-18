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
  buildPeacheeManifest,
  loadPeacheeProjects,
  selectEnabledPeacheeProjects,
} from './peachee-projects.js';

export async function generatePeacheeManifest({ peacheeRoot, outputPath, projectFilter = '' }) {
  const projects = await loadPeacheeProjects(peacheeRoot);
  const projectNames = selectEnabledPeacheeProjects(projects, projectFilter);
  const manifest = await buildPeacheeManifest(peacheeRoot, projectNames);
  await writeJsonFile(outputPath, manifest);
  return manifest;
}

async function main() {
  const args = parseOptionArgs(process.argv);
  const cwd = process.cwd();
  const manifest = await generatePeacheeManifest({
    peacheeRoot: resolve(requireOption(args, '--peachee-root')),
    outputPath: resolvePathUnder(cwd, requireOption(args, '--output'), '--output'),
    projectFilter: args.get('--project-filter') ?? '',
  });
  console.log(`Wrote peachee SIT manifest (${manifest.length} project(s))`);
}

if (isMain(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
