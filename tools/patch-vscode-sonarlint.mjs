#!/usr/bin/env node

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

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptName = basename(scriptPath);
const repoRoot = resolve(dirname(scriptPath), '..');
const childEnv = {
  ...process.env,
  PATH: [dirname(process.execPath), process.env.PATH].filter(Boolean).join(delimiter),
};
const backupStampPrefix = 'sonarjs.jar.bak-';
const backupStampPattern = /^\d{8}T\d{6}[+-]\d{4}$/;

const state = {
  activeStamp: '',
  extensionPath: '',
};

function usage() {
  return `Patch a local VS Code SonarLint / SonarQube for IDE installation with a SonarJS jar.

USAGE:
  ${scriptName} [OPTIONS]

PATCH OPTIONS:
  --build               Build the plugin jar from the current checkout with:
                        mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package
                        This may update generated tracked files in the repo.
  --jar <path>          Use an existing sonar-javascript-plugin jar
  --ext <path>          Patch a specific sonarsource.sonarlint-vscode-* directory
  --server              Prefer ~/.vscode-server/extensions
  --desktop             Prefer ~/.vscode/extensions

RESTORE OPTIONS:
  --restore <stamp>     Restore analyzer and eslint-bridge from a backup stamp
  --restore latest      Restore the most recent backup for the chosen extension

GENERAL:
  --help, -h            Show this help text

DEFAULTS:
  - Without --jar, the script uses the newest local
    sonar-plugin/sonar-javascript-plugin/target/sonar-javascript-plugin-*.jar
  - In auto mode, the script prefers ~/.vscode-server/extensions when present,
    otherwise ~/.vscode/extensions

EXAMPLES:
  ${scriptName} --build
  ${scriptName} --jar "$HOME/Downloads/sonar-javascript-plugin-12.6.0-SNAPSHOT.jar"
  ${scriptName} --desktop --build
  ${scriptName} --restore latest
  ${scriptName} --restore 20260602T105318+0200 --ext "$HOME/.vscode/extensions/sonarsource.sonarlint-vscode-5.3.0-darwin-arm64"`;
}

function info(message = '') {
  process.stdout.write(`${message}\n`);
}

function warn(message) {
  process.stderr.write(`Warning: ${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function formatCommand(command, args) {
  return [command, ...args].join(' ');
}

function stderrText(stderr) {
  if (typeof stderr === 'string') {
    return stderr.trim();
  }

  if (Buffer.isBuffer(stderr)) {
    return stderr.toString('utf8').trim();
  }

  return '';
}

function commandFailureMessage(description, stderr) {
  return stderr
    ? `Command failed: ${description}\n${stderr}`
    : `Command failed: ${description}`;
}

function spawnChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? childEnv,
    input: options.input,
    encoding: options.encoding,
    stdio: options.stdio,
    maxBuffer: 128 * 1024 * 1024,
  });

  if (result.error) {
    fail(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = stderrText(result.stderr);
    const description = options.description ?? formatCommand(command, args);
    fail(commandFailureMessage(description, stderr));
  }

  return result;
}

function runInteractive(command, args, options = {}) {
  spawnChecked(command, args, {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    encoding: options.encoding ?? 'buffer',
    stdio: options.stdio ?? ['inherit', 'inherit', 'inherit'],
    description: options.description,
  });
}

function commandOutput(command, args, options = {}) {
  const result = spawnChecked(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    description: options.description,
  });

  return result.stdout.trimEnd();
}

function commandBuffer(command, args, options = {}) {
  const result = spawnChecked(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: 'buffer',
    stdio: ['inherit', 'pipe', 'pipe'],
    description: options.description,
  });

  return result.stdout;
}

function parseCliArgs(argv) {
  const options = {
    targetKind: 'auto',
    extensionPath: '',
    patchJar: '',
    runBuild: false,
    restoreStamp: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--build':
        options.runBuild = true;
        break;
      case '--jar':
        index += 1;
        if (index >= argv.length) {
          fail('--jar requires a path');
        }
        options.patchJar = argv[index];
        break;
      case '--ext':
        index += 1;
        if (index >= argv.length) {
          fail('--ext requires a path');
        }
        options.extensionPath = argv[index];
        break;
      case '--restore':
        index += 1;
        if (index >= argv.length) {
          fail("--restore requires a stamp or 'latest'");
        }
        options.restoreStamp = argv[index];
        break;
      case '--server':
        options.targetKind = 'server';
        break;
      case '--desktop':
        options.targetKind = 'desktop';
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        fail(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function resolveExistingPath(targetPath) {
  if (!existsSync(targetPath)) {
    fail(`Path does not exist: ${targetPath}`);
  }

  return realpathSync(targetPath);
}

function selectLatest(paths) {
  if (paths.length === 0) {
    return '';
  }

  return paths.reduce((best, candidate) =>
    statSync(candidate).mtimeMs > statSync(best).mtimeMs ? candidate : best,
  );
}

function listDirectories(root, predicate) {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && predicate(entry.name))
    .map(entry => join(root, entry.name));
}

function listFiles(root, predicate) {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && predicate(entry.name))
    .map(entry => join(root, entry.name));
}

function latestExtensionInRoot(root) {
  const matches = listDirectories(root, name => name.startsWith('sonarsource.sonarlint-vscode-'));
  return selectLatest(matches);
}

function detectExtensionPath(targetKind) {
  const serverRoot = join(process.env.HOME ?? '', '.vscode-server', 'extensions');
  const desktopRoot = join(process.env.HOME ?? '', '.vscode', 'extensions');

  if (targetKind === 'server') {
    const serverExtension = latestExtensionInRoot(serverRoot);
    if (!serverExtension) {
      fail(`No sonarsource.sonarlint-vscode-* extension found under ${serverRoot}`);
    }
    return serverExtension;
  }

  if (targetKind === 'desktop') {
    const desktopExtension = latestExtensionInRoot(desktopRoot);
    if (!desktopExtension) {
      fail(`No sonarsource.sonarlint-vscode-* extension found under ${desktopRoot}`);
    }
    return desktopExtension;
  }

  const serverExtension = latestExtensionInRoot(serverRoot);
  const desktopExtension = latestExtensionInRoot(desktopRoot);

  if (serverExtension) {
    if (desktopExtension) {
      warn('Found both server and desktop extension copies; using server copy.');
      warn('Pass --desktop, --server, or --ext to override.');
    }
    return serverExtension;
  }

  if (desktopExtension) {
    return desktopExtension;
  }

  fail(`No sonarsource.sonarlint-vscode-* extension found under ${serverRoot} or ${desktopRoot}`);
}

function latestLocalPatchJar() {
  const targetDirectory = join(repoRoot, 'sonar-plugin', 'sonar-javascript-plugin', 'target');
  const matches = listFiles(targetDirectory, name => {
    if (!name.startsWith('sonar-javascript-plugin-') || !name.endsWith('.jar')) {
      return false;
    }

    return !['-sources.jar', '-javadoc.jar', '-multi.jar', '-darwin-', '-linux-', '-win-'].some(
      fragment => name.includes(fragment),
    );
  });

  return selectLatest(matches);
}

function bridgePayloadEntry(jarPath) {
  const entries = commandOutput('unzip', ['-Z1', jarPath]).split(/\r?\n/);
  return entries.find(entry => /^sonarjs-.*\.tgz$/.test(entry)) ?? '';
}

function manifestSummaryLines(jarPath) {
  return commandOutput('unzip', ['-p', jarPath, 'META-INF/MANIFEST.MF'])
    .split(/\r?\n/)
    .filter(line => /^(Plugin-Version|Plugin-Display-Version|Implementation-Build):/.test(line));
}

function latestBackupStamp(extensionPath) {
  const analyzerDirectory = join(extensionPath, 'analyzers');
  const matches = listFiles(
    analyzerDirectory,
    name =>
      name.startsWith(backupStampPrefix) &&
      backupStampPattern.test(name.slice(backupStampPrefix.length)),
  );
  const latest = selectLatest(matches);
  return latest ? basename(latest).slice(backupStampPrefix.length) : '';
}

function desktopLogRoot(home) {
  if (process.platform === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Code', 'logs');
  }

  if (process.platform === 'linux') {
    return join(home, '.config', 'Code', 'logs');
  }

  return '';
}

function logRootForExtension(extensionPath) {
  const home = process.env.HOME ?? '';
  const serverPrefix = join(home, '.vscode-server', 'extensions') + '/';
  const desktopPrefix = join(home, '.vscode', 'extensions') + '/';

  if (extensionPath.startsWith(serverPrefix)) {
    return join(home, '.vscode-server', 'data', 'logs');
  }

  if (extensionPath.startsWith(desktopPrefix)) {
    return desktopLogRoot(home);
  }

  return '';
}

function printLogHint(extensionPath) {
  const logRoot = logRootForExtension(extensionPath);
  if (!logRoot) {
    warn(`Could not infer the SonarQube for IDE logs directory for ${extensionPath}.`);
    return;
  }

  info('');
  info('After reloading VS Code and opening a JS/TS file, verify the runtime with:');
  info(
    `  LATEST_LOG="$(find "${logRoot}" -path '*SonarSource.sonarlint-vscode/SonarQube for IDE.log' 2>/dev/null | sort | tail -n 1)"`,
  );
  info(
    String.raw`  grep -En 'Starting analysis with configuration|sonar\.js\.internal\.bundlePath|server\.cjs' "$LATEST_LOG"`,
  );
}

function formatTimestamp(date) {
  const pad = value => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absoluteOffset / 60));
  const offsetRemainder = pad(absoluteOffset % 60);

  return `${year}${month}${day}T${hours}${minutes}${seconds}${sign}${offsetHours}${offsetRemainder}`;
}

function buildLocalPlugin() {
  info(`Building sonar-javascript-plugin from ${repoRoot}`);
  info('Command: mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package');
  info('Note: this build may update generated tracked files such as README rule counts.');

  runInteractive(
    'mvn',
    ['-pl', 'sonar-plugin/sonar-javascript-plugin', '-am', '-DskipTests', 'package'],
    { cwd: repoRoot },
  );
}

function printManifestSummary(jarPath) {
  for (const line of manifestSummaryLines(jarPath)) {
    info(line);
  }
}

function validateBackupStamp(stamp) {
  if (!backupStampPattern.test(stamp)) {
    fail(
      `Invalid backup stamp format: ${stamp} (expected YYYYMMDDTHHmmss+HHMM or YYYYMMDDTHHmmss-HHMM)`,
    );
  }

  return stamp;
}

function patchExtension(extensionPath, patchJar) {
  const analyzerJar = join(extensionPath, 'analyzers', 'sonarjs.jar');
  const eslintBridge = join(extensionPath, 'eslint-bridge');

  if (!existsSync(patchJar)) {
    fail(`Patch jar not found: ${patchJar}`);
  }

  if (!existsSync(analyzerJar)) {
    fail(`Missing analyzer jar under ${join(extensionPath, 'analyzers')}`);
  }

  const payload = bridgePayloadEntry(patchJar);
  if (!payload) {
    fail(`Could not find embedded sonarjs *.tgz payload in ${patchJar}`);
  }

  const stamp = formatTimestamp(new Date());
  state.activeStamp = stamp;
  state.extensionPath = extensionPath;

  info(`Patching extension: ${extensionPath}`);
  info(`Using jar: ${patchJar}`);
  info(`Embedded bridge payload: ${payload}`);

  cpSync(analyzerJar, `${analyzerJar}.bak-${stamp}`);

  if (existsSync(eslintBridge)) {
    renameSync(eslintBridge, `${eslintBridge}.bak-${stamp}`);
  }

  cpSync(patchJar, analyzerJar);
  mkdirSync(eslintBridge, { recursive: true });

  const payloadBuffer = commandBuffer('unzip', ['-p', analyzerJar, payload]);
  runInteractive('tar', ['-xzf', '-', '-C', eslintBridge], {
    input: payloadBuffer,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  const serverScript = join(eslintBridge, 'package', 'bin', 'server.cjs');
  if (!existsSync(serverScript)) {
    fail('eslint-bridge extraction failed: package/bin/server.cjs is missing');
  }

  info('');
  info('Patch complete.');
  info(`Backup stamp: ${stamp}`);
  printManifestSummary(analyzerJar);
  info('');
  info('Restore with:');
  info(`  ${scriptPath} --restore ${stamp} --ext ${JSON.stringify(extensionPath)}`);
  printLogHint(extensionPath);
}

function restoreExtension(extensionPath, stamp) {
  const validatedStamp = validateBackupStamp(stamp);
  const analyzerJar = join(extensionPath, 'analyzers', 'sonarjs.jar');
  const backupJar = `${analyzerJar}.bak-${validatedStamp}`;
  const eslintBridge = join(extensionPath, 'eslint-bridge');
  const backupBridge = `${eslintBridge}.bak-${validatedStamp}`;

  if (!existsSync(backupJar)) {
    fail(`Backup jar not found: ${backupJar}`);
  }

  info(`Restoring extension: ${extensionPath}`);
  info(`Using backup stamp: ${validatedStamp}`);

  cpSync(backupJar, analyzerJar);

  if (existsSync(backupBridge)) {
    rmSync(eslintBridge, { recursive: true, force: true });
    renameSync(backupBridge, eslintBridge);
  } else {
    warn(
      `No eslint-bridge backup found for stamp ${validatedStamp}; left current eslint-bridge in place.`,
    );
  }

  info('');
  info('Restore complete.');
  printManifestSummary(analyzerJar);
}

function validateOptions(options) {
  if (options.restoreStamp && options.runBuild) {
    fail('--restore cannot be combined with --build');
  }

  if (options.restoreStamp && options.patchJar) {
    fail('--restore cannot be combined with --jar');
  }

  if (options.patchJar && options.runBuild) {
    fail('--build cannot be combined with --jar');
  }
}

function resolveTargetExtensionPath(options) {
  const extensionPath = options.extensionPath
    ? resolveExistingPath(options.extensionPath)
    : detectExtensionPath(options.targetKind);

  if (!existsSync(extensionPath)) {
    fail(`Extension directory not found: ${extensionPath}`);
  }

  return extensionPath;
}

function resolveRestoreStamp(restoreStamp, extensionPath) {
  if (restoreStamp !== 'latest') {
    return restoreStamp;
  }

  const latestStamp = latestBackupStamp(extensionPath);
  if (!latestStamp) {
    fail(`No backup stamps found under ${join(extensionPath, 'analyzers')}`);
  }

  return latestStamp;
}

function resolvePatchJarPath(patchJar) {
  const resolvedPatchJar = patchJar ? resolveExistingPath(patchJar) : latestLocalPatchJar();
  if (!resolvedPatchJar) {
    fail('No local sonar-javascript-plugin jar found. Run with --build or pass --jar <path>.');
  }

  return resolvedPatchJar;
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    info(usage());
    return;
  }

  validateOptions(options);

  const extensionPath = resolveTargetExtensionPath(options);
  if (options.restoreStamp) {
    restoreExtension(extensionPath, resolveRestoreStamp(options.restoreStamp, extensionPath));
    return;
  }

  if (options.runBuild) {
    buildLocalPlugin();
  }

  patchExtension(extensionPath, resolvePatchJarPath(options.patchJar));
}

try {
  main();
} catch (error) {
  if (state.activeStamp && state.extensionPath) {
    warn('Patch may be incomplete.');
    warn(
      `Restore with: ${scriptPath} --restore ${state.activeStamp} --ext ${JSON.stringify(state.extensionPath)}`,
    );
  }

  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
