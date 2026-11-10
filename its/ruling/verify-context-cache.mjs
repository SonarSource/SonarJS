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
import { gunzipSync } from 'node:zlib';
import { deserializeProtobufDocument } from '../../lib/shared/src/fs-cache/archive-serialization.js';
import { sonarjs } from '../../lib/analysis/src/program-selection/analysis-metadata-proto.js';

const directory = path.resolve(process.argv[2] ?? 'its/ruling/target/context-cache');
const expected = JSON.parse(fs.readFileSync(path.join(directory, 'expected-inputs.json'), 'utf8'));
const phases = JSON.parse(fs.readFileSync(path.join(directory, 'measurements.json'), 'utf8'));
const readSelection = phase =>
  sonarjs.programselection.AnalysisMetadata.decode(
    gunzipSync(fs.readFileSync(path.join(directory, phase, 'analysis-metadata.pb.gz'))),
  ).programSelection;
const baseline = readSelection('master');
const baselineFiles = new Set([
  ...baseline.files.map(selection => selection.filePath),
  ...baseline.noProgramFiles,
]);
const reports = [];
for (const phase of phases.filter(phase => phase.phase.endsWith('-with'))) {
  const output = path.join(directory, phase.phase);
  const archive = deserializeProtobufDocument(
    gunzipSync(fs.readFileSync(path.join(output, 'filesystem-cache.pb.gz'))),
  );
  const entries = new Map(archive.entries.map(entry => [entry.path, entry.node]));
  for (const [file, contents] of Object.entries(expected)) {
    const node = entries.get(archive.caseSensitivePaths ? file : file.toLowerCase());
    assert(node?.content?.ok, `Missing source contents in ${phase.phase}: ${file}`);
    assert.equal(node.content.value.toString('utf8'), contents, `Stale contents: ${file}`);
  }
  const selection = readSelection(phase.phase);
  assert(selection?.programs.length > 0, 'No TypeScript programs recorded');
  const selectedFiles = new Set([
    ...selection.files.map(file => file.filePath),
    ...selection.noProgramFiles,
  ]);
  assert.deepEqual(selectedFiles, baselineFiles, 'PR lost baseline program-selection coverage');
  reports.push({
    phase: phase.phase,
    sourceFilesVerified: Object.keys(expected).length,
    archiveEntries: archive.entries.length,
    recordedContentFiles: archive.entries.filter(entry => entry.node.content?.ok).length,
    recordedContentBytes: archive.entries.reduce(
      (bytes, entry) => bytes + (entry.node.content?.ok ? entry.node.content.value.length : 0),
      0,
    ),
    configuredOrOrphanPrograms: selection.programs.length,
    programSelections: selection.files.length,
    noProgramFiles: selection.noProgramFiles.length,
  });
}
assert(reports.length > 0, 'No PR context was generated');
fs.writeFileSync(path.join(directory, 'completeness.json'), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
