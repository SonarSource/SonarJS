import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const DIST_DATA_DIR = path.join(DIST_DIR, 'data');
const latestSnapshot = path.join(ROOT, 'data', 'latest.json');
const WINDOW_DAYS = Number.parseInt(process.env.TELEMETRY_WINDOW_DAYS ?? '21', 10) || 21;

function createEmptySnapshot() {
  const now = new Date();
  return {
    generatedAt: now.toISOString(),
    source: 'empty',
    windowDays: WINDOW_DAYS,
    windowStart: new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    notes: [
      'No local telemetry snapshot was found at data/latest.json.',
      'Run npm run fetch:redshift locally or let CI refresh the dashboard before publishing.',
    ],
    platforms: {
      sq: {
        id: 'sq',
        label: 'SonarQube Server',
        shortLabel: 'SQS',
        view: 'measures.sq_analysis_javascript_adhoc',
        latestProjectCount: 0,
        fieldCount: 0,
        fields: {},
      },
      sc: {
        id: 'sc',
        label: 'SonarQube Cloud',
        shortLabel: 'SQC',
        view: 'measures.sc_analysis_javascript_adhoc',
        latestProjectCount: 0,
        fieldCount: 0,
        fields: {},
      },
    },
    catalog: [],
    overview: {
      moduleType: {},
    },
  };
}

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DATA_DIR, { recursive: true });

console.log('Bundling frontend...');
await build({
  bundle: true,
  entryPoints: [path.join(ROOT, 'src', 'main.ts')],
  format: 'esm',
  outfile: path.join(DIST_DIR, 'main.js'),
  platform: 'browser',
  target: ['es2022'],
});

console.log('Copying static assets...');
cpSync(path.join(ROOT, 'src', 'index.html'), path.join(DIST_DIR, 'index.html'));
cpSync(path.join(ROOT, 'src', 'styles.css'), path.join(DIST_DIR, 'styles.css'));

if (existsSync(latestSnapshot)) {
  cpSync(latestSnapshot, path.join(DIST_DATA_DIR, 'snapshot.json'));
  console.log(`Using ${path.relative(ROOT, latestSnapshot)} as snapshot source`);
} else {
  writeFileSync(path.join(DIST_DATA_DIR, 'snapshot.json'), `${JSON.stringify(createEmptySnapshot(), null, 2)}\n`);
  console.log('No data/latest.json found, emitted an empty placeholder snapshot');
}

writeFileSync(path.join(DIST_DIR, '.nojekyll'), '');
console.log(`Build complete: ${DIST_DIR}`);
