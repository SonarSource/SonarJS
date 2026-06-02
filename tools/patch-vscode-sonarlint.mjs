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

const state = {
  canRestore: false,
  extensionPath: '',
};

function usage() {
  return `Patch a local VS Code SonarLint / SonarQube for IDE installation with a SonarJS jar.

USAGE:
  ${scriptName} [OPTIONS]

PATCH OPTIONS:
  --build               Compatibility alias. Patch mode already rebuilds by default.
  --jar <path>          Use an existing sonar-javascript-plugin jar instead of rebuilding
  --ext <path>          Patch a specific sonarsource.sonarlint-vscode-* directory
  --server              Prefer ~/.vscode-server/extensions
  --desktop             Prefer ~/.vscode/extensions

RESTORE OPTIONS:
  --restore [target]    Restore the original backup for the chosen extension
                        Accepts 'original' and 'latest' as compatibility aliases

GENERAL:
  --help, -h            Show this help text

DEFAULTS:
  - Without --jar, the script rebuilds the plugin from the current checkout with:
    mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package
  - The patch uses the non-classifier sonar-javascript-plugin-*.jar produced by
    that build and aborts if the build does not produce one
  - The first successful patch of an extension directory stores one original backup:
    analyzers/sonarjs.jar.original and eslint-bridge.original
  - In auto mode, the script prefers ~/.vscode-server/extensions when present,
    otherwise ~/.vscode/extensions

EXAMPLES:
  ${scriptName}
  ${scriptName} --jar "$HOME/Downloads/sonar-javascript-plugin-12.6.0-SNAPSHOT.jar"
  ${scriptName} --desktop
  ${scriptName} --restore
  ${scriptName} --restore latest --ext "$HOME/.vscode/extensions/sonarsource.sonarlint-vscode-5.3.0-darwin-arm64"`;
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
    runBuildAlias: false,
    restoreMode: '',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--build':
        options.runBuildAlias = true;
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
        if (index + 1 < argv.length && !argv[index + 1].startsWith('--')) {
          index += 1;
          options.restoreMode = argv[index];
        } else {
          options.restoreMode = 'original';
        }
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

function bridgePayloadEntry(jarPath) {
  const entries = commandOutput('unzip', ['-Z1', jarPath]).split(/\r?\n/);
  return entries.find(entry => /^sonarjs-.*\.tgz$/.test(entry)) ?? '';
}

function manifestSummaryLines(jarPath) {
  return commandOutput('unzip', ['-p', jarPath, 'META-INF/MANIFEST.MF'])
    .split(/\r?\n/)
    .filter(line => /^(Plugin-Version|Plugin-Display-Version|Implementation-Build):/.test(line));
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

function patchJarTargetDirectory() {
  return join(repoRoot, 'sonar-plugin', 'sonar-javascript-plugin', 'target');
}

function isPatchJarFile(name) {
  if (!name.startsWith('sonar-javascript-plugin-') || !name.endsWith('.jar')) {
    return false;
  }

  return !['-sources.jar', '-javadoc.jar', '-multi.jar', '-darwin-', '-linux-', '-win-'].some(
    fragment => name.includes(fragment),
  );
}

function patchJarCandidates(targetDirectory = patchJarTargetDirectory()) {
  return listFiles(targetDirectory, isPatchJarFile);
}

function fileSignature(path) {
  const stats = statSync(path);
  return `${stats.size}:${stats.mtimeMs}`;
}

function snapshotFiles(paths) {
  return new Map(paths.map(path => [path, fileSignature(path)]));
}

function resolveBuiltPatchJar(targetDirectory, beforeBuildSnapshot) {
  const candidates = patchJarCandidates(targetDirectory);
  const changedCandidates = candidates.filter(
    candidate => beforeBuildSnapshot.get(candidate) !== fileSignature(candidate),
  );

  if (changedCandidates.length === 1) {
    return changedCandidates[0];
  }

  if (changedCandidates.length === 0) {
    fail(
      `Build completed but did not produce a non-classifier sonar-javascript-plugin-*.jar under ${targetDirectory}`,
    );
  }

  fail(
    `Build completed but produced multiple candidate jars under ${targetDirectory}: ${changedCandidates.join(', ')}`,
  );
}

function originalAnalyzerBackupPath(extensionPath) {
  return join(extensionPath, 'analyzers', 'sonarjs.jar.original');
}

function originalBridgeBackupPath(extensionPath) {
  return join(extensionPath, 'eslint-bridge.original');
}

function ensureOriginalBackup(extensionPath) {
  const analyzerJar = join(extensionPath, 'analyzers', 'sonarjs.jar');
  const eslintBridge = join(extensionPath, 'eslint-bridge');
  const backupJar = originalAnalyzerBackupPath(extensionPath);
  const backupBridge = originalBridgeBackupPath(extensionPath);
  const hasBackupJar = existsSync(backupJar);
  const hasBackupBridge = existsSync(backupBridge);

  if (hasBackupJar && hasBackupBridge) {
    return false;
  }

  if (hasBackupJar || hasBackupBridge) {
    fail(
      `Found an incomplete original backup under ${extensionPath}. Remove ${basename(backupJar)} and ${basename(backupBridge)}, or reinstall the extension before retrying.`,
    );
  }

  if (!existsSync(analyzerJar)) {
    fail(`Missing analyzer jar under ${join(extensionPath, 'analyzers')}`);
  }

  if (!existsSync(eslintBridge)) {
    fail(`Missing eslint-bridge under ${extensionPath}; cannot capture the original backup.`);
  }

  try {
    cpSync(analyzerJar, backupJar);
    cpSync(eslintBridge, backupBridge, { recursive: true });
  } catch (error) {
    rmSync(backupJar, { force: true });
    rmSync(backupBridge, { recursive: true, force: true });
    throw error;
  }

  return true;
}

function normalizeRestoreMode(requestedRestoreMode) {
  if (!requestedRestoreMode || requestedRestoreMode === 'original') {
    return 'original';
  }

  if (requestedRestoreMode === 'latest') {
    warn('--restore latest now restores the original backup for the selected extension directory.');
    return 'original';
  }

  fail(
    'Restore no longer accepts backup stamps. Use --restore to restore the original backup for the selected extension directory.',
  );
}

function buildLocalPlugin() {
  const targetDirectory = patchJarTargetDirectory();
  const beforeBuildSnapshot = snapshotFiles(patchJarCandidates(targetDirectory));

  info(`Building sonar-javascript-plugin from ${repoRoot}`);
  info('Command: mvn -pl sonar-plugin/sonar-javascript-plugin -am -DskipTests package');
  info('Note: this build may update generated tracked files such as README rule counts.');

  runInteractive(
    'mvn',
    ['-pl', 'sonar-plugin/sonar-javascript-plugin', '-am', '-DskipTests', 'package'],
    { cwd: repoRoot },
  );

  const builtJar = resolveBuiltPatchJar(targetDirectory, beforeBuildSnapshot);
  info(`Built jar: ${builtJar}`);
  return builtJar;
}

function printManifestSummary(jarPath) {
  for (const line of manifestSummaryLines(jarPath)) {
    info(line);
  }
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

  info(`Patching extension: ${extensionPath}`);
  info(`Using jar: ${patchJar}`);
  info(`Embedded bridge payload: ${payload}`);
  const createdOriginalBackup = ensureOriginalBackup(extensionPath);
  info(
    createdOriginalBackup
      ? 'Captured the original extension backup for this directory.'
      : 'Original extension backup already exists; leaving it unchanged.',
  );

  state.canRestore = true;
  state.extensionPath = extensionPath;

  cpSync(patchJar, analyzerJar);
  rmSync(eslintBridge, { recursive: true, force: true });
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
  printManifestSummary(analyzerJar);
  info('');
  info('Restore the original extension with:');
  info(`  ${scriptPath} --restore --ext ${JSON.stringify(extensionPath)}`);
  printLogHint(extensionPath);
}

function restoreExtension(extensionPath) {
  const analyzerJar = join(extensionPath, 'analyzers', 'sonarjs.jar');
  const backupJar = originalAnalyzerBackupPath(extensionPath);
  const eslintBridge = join(extensionPath, 'eslint-bridge');
  const backupBridge = originalBridgeBackupPath(extensionPath);

  if (!existsSync(backupJar) || !existsSync(backupBridge)) {
    fail(
      `Original backup not found for ${extensionPath}. Reinstall or update the extension to get a fresh official copy, or patch a clean extension directory first.`,
    );
  }

  info(`Restoring extension: ${extensionPath}`);
  info('Using original backup files.');

  cpSync(backupJar, analyzerJar);
  rmSync(eslintBridge, { recursive: true, force: true });
  cpSync(backupBridge, eslintBridge, { recursive: true });

  info('');
  info('Restore complete.');
  printManifestSummary(analyzerJar);
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    info(usage());
    return;
  }

  if (options.restoreMode && options.patchJar) {
    fail('--restore cannot be combined with --jar');
  }

  const extensionPath = options.extensionPath
    ? resolveExistingPath(options.extensionPath)
    : detectExtensionPath(options.targetKind);

  if (!existsSync(extensionPath)) {
    fail(`Extension directory not found: ${extensionPath}`);
  }

  if (options.runBuildAlias) {
    if (options.restoreMode) {
      warn('--build is ignored because --restore does not rebuild.');
    } else if (options.patchJar) {
      warn('--build is ignored because --jar skips the rebuild.');
    } else {
      warn('--build is no longer required; patch mode already rebuilds by default.');
    }
  }

  if (options.restoreMode) {
    normalizeRestoreMode(options.restoreMode);
    restoreExtension(extensionPath);
    return;
  }

  const patchJar = options.patchJar ? resolveExistingPath(options.patchJar) : buildLocalPlugin();

  patchExtension(extensionPath, patchJar);
}

try {
  main();
} catch (error) {
  if (state.canRestore && state.extensionPath) {
    warn('Patch may be incomplete.');
    warn(`Restore with: ${scriptPath} --restore --ext ${JSON.stringify(state.extensionPath)}`);
  }

  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
