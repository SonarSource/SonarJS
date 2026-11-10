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
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { handleAnalyzeProjectRequest } from '../../lib/grpc/src/analyze-project-handle-request.js';
import { installFsCache } from '../../lib/shared/src/fs-cache/hook.js';

const script = fileURLToPath(import.meta.url);
const output = path.resolve(process.argv[3] ?? 'its/ruling/target/program-mapping');
const content = 'export const values: number[] = [80, 3, 9]; values.sort();';

if (process.argv[2] === '--worker') {
  const [kind, mode, iteration] = process.argv.slice(4);
  const baseDir = path.join(output, kind);
  const allFiles = JSON.parse(fs.readFileSync(path.join(baseDir, 'inputs.json')));
  const changed = Object.keys(allFiles)[0];
  const files = mode === 'without' ? { [changed]: allFiles[changed] } : allFiles;
  for (const [file, input] of Object.entries(files)) {
    input.skipAnalysis = mode === 'with' && file !== changed;
  }
  const directory = path.join(output, `${kind}-${mode}-${iteration}`);
  fs.mkdirSync(directory);
  installFsCache();
  const started = performance.now();
  const response = await handleAnalyzeProjectRequest(
    {
      type: 'on-analyze-project',
      data: {
        configuration: { baseDir, canAccessFileSystem: true },
        files,
        rules: [{ key: 'S2871', language: 2, fileTypeTargets: [1], analysisModes: [1] }],
        filesystemCache:
          mode === 'without'
            ? undefined
            : {
                mode: 1,
                archivePath: path.join(directory, 'fs.pb.gz'),
                analysisMetadataPath: path.join(directory, 'programs.pb.gz'),
                snapshotManifestPath: path.join(directory, 'complete.json'),
              },
      },
    },
    { debugMemory: false },
  );
  const elapsedMs = performance.now() - started;
  assert.equal(response.type, 'success', JSON.stringify(response));
  const result = response.result.output;
  const analyzed = Object.values(result.files);
  assert.equal(analyzed.length, mode === 'full' ? Object.keys(allFiles).length : 1);
  assert(analyzed.every(file => !('error' in file) && file.issues.length === 1));
  if (mode !== 'without') assert(fs.existsSync(path.join(directory, 'complete.json')));
  const metric = {
    kind,
    mode,
    iteration,
    elapsedMs,
    inputFiles: Object.keys(allFiles).length,
    analyzedFiles: analyzed.length,
    programs: result.meta.telemetry.programCreation.attempted,
    peakNodeRssBytes: process.resourceUsage().maxRSS * 1024,
  };
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(metric, null, 2));
} else {
  assert(!fs.existsSync(output), 'Use a fresh output directory');
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  for (const kind of ['independent-configs', 'orphans']) {
    const project = path.join(output, kind);
    fs.mkdirSync(project);
    const inputs = {};
    for (let group = 0; group < 10; group++) {
      const directory = path.join(project, `package-${group}`);
      fs.mkdirSync(directory);
      const names = [];
      for (let index = 0; index < 100; index++) {
        const name = `source-${index}.ts`;
        const file = path.join(directory, name).replaceAll('\\', '/');
        names.push(name);
        inputs[file] = { fileType: 1, fileStatus: 2 };
        fs.writeFileSync(file, content);
      }
      if (kind === 'independent-configs') {
        fs.writeFileSync(path.join(directory, 'tsconfig.json'), JSON.stringify({ files: names }));
      }
    }
    fs.writeFileSync(path.join(project, 'inputs.json'), JSON.stringify(inputs));
    for (let iteration = 0; iteration < 4; iteration++) {
      const modes = iteration % 2 ? ['full', 'with', 'without'] : ['without', 'with', 'full'];
      for (const mode of modes) {
        const directory = path.join(output, `${kind}-${mode}-${iteration}`);
        const log = fs.openSync(path.join(output, `${kind}-${mode}-${iteration}.log`), 'w');
        const child = spawnSync(
          process.execPath,
          [script, '--worker', output, kind, mode, String(iteration)],
          {
            stdio: ['ignore', log, log],
          },
        );
        fs.closeSync(log);
        assert.equal(child.status, 0, `${kind} ${mode}: see log at ${output}`);
        results.push(JSON.parse(fs.readFileSync(path.join(directory, 'result.json'))));
        fs.writeFileSync(path.join(output, 'measurements.json'), JSON.stringify(results, null, 2));
      }
    }
  }
  console.log(JSON.stringify(results, null, 2));
}
