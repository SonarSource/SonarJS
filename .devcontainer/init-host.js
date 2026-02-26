#!/usr/bin/env node
// Populates the Docker named volume dc-sonarjs-secrets with ~/.npmrc.
// Runs as initializeCommand. Requires Docker CLI.
// Self-signed certificate support is handled via .npmrc (e.g. cafile= or strict-ssl=false).
'use strict';

const { execSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { homedir } = require('os');
const { join } = require('path');

const VOLUME = 'dc-sonarjs-secrets';
const log = msg => console.log(`[init-host] ${msg}`);

try {
  log(`HOME=${homedir()}`);
  log(`USER=${process.env.USER ?? '<not set>'}`);

  const npmrcPath = join(homedir(), '.npmrc');
  log(`npmrc path: ${npmrcPath}`);
  if (existsSync(npmrcPath)) {
    process.stdout.write(execSync(`ls -la "${npmrcPath}"`, { encoding: 'utf8' }));
  } else {
    log('~/.npmrc not found');
  }

  execSync(`docker volume create ${VOLUME}`, { stdio: 'pipe' });
  log(`Volume '${VOLUME}' ready.`);

  if (existsSync(npmrcPath)) {
    const dockerCmd = `docker run --rm -i -v ${VOLUME}:/secrets alpine sh -c 'cat > /secrets/dc-npmrc'`;
    log(`Running: ${dockerCmd}`);
    execSync(dockerCmd, { input: readFileSync(npmrcPath), stdio: ['pipe', 'inherit', 'inherit'] });
    log('~/.npmrc copied.');
  } else {
    const dockerCmd = `docker run --rm -v ${VOLUME}:/secrets alpine touch /secrets/dc-npmrc`;
    log(`Running: ${dockerCmd}`);
    execSync(dockerCmd, { stdio: 'pipe' });
    log('Created empty placeholder.');
  }

  log('Done.');
} catch (err) {
  console.error(`[init-host] Error: ${err.message}`);
  console.error('[init-host] Continuing without volume setup.');
  process.exit(0);
}
