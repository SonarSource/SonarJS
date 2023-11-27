/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import fetch from 'node-fetch';
import fs from 'fs-extra';
import extract from 'extract-zip';
import tar from 'tar';
import * as path from 'node:path';
import * as stream from 'node:stream';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
import { DISTROS } from '../node-distros.mjs';
import { DOWNLOAD_DIR, RUNTIMES_DIR } from './directories.mjs';

/**
 * Fetches node.js runtimes and downloads them to
 * downloads/runtimes/{distro.id}/node{.exe}
 */

for (const distro of DISTROS) {
  const filename = getFilenameFromUrl(distro.url);
  const archiveFilename = path.join(DOWNLOAD_DIR, filename);
  await downloadRuntime(distro, archiveFilename);
  validateFile(distro.sha, archiveFilename);
  await extractFile(archiveFilename, DOWNLOAD_DIR);
  const distroName = removeExtension(filename);
  copyRuntime(distroName, distro.id, distro.binPath, DOWNLOAD_DIR, RUNTIMES_DIR);
}

/**
 * Download the node runtime from Artifactory
 * If it fails, fallback on nodejs.org
 *
 * @param distro item from `NODE_DISTROS`
 * @param targetFilename the filename it will have when downloaded
 */
async function downloadRuntime(distro, targetFilename) {
  try {
    await downloadFile(distro.artifactoryUrl, targetFilename, retrieveArtifactoryKey());
  } catch (error) {
    console.log(`Error while downloading from artifactory: `);
    console.log(error);
    console.log(`Falling back to Node.js org.`);
    await downloadFile(distro.url, targetFilename);
  }
}

/**
 * Validate file content against a given SHA
 *
 * @param sha
 * @param filename
 */
function validateFile(sha, filename) {
  const file = fs.readFileSync(filename);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(file);
  if (sha !== hashSum.digest('hex')) {
    console.log(`SHAsum invalid for ${filename}.`);
    process.exit(1);
  }
  console.log(`SHAsum valid for ${filename}`);
}

/**
 * Retrieves the last part of a URL path
 *
 * @param url
 * @returns {*}
 */
function getFilenameFromUrl(url) {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * Copies the node runtime executable from nodeDir based on the distribution
 * file organization into `targetDir/distroId/node{.exe}`
 *
 * @param {*} distroName
 * @param {*} distroId
 * @param {*} nodeDir
 * @param {*} targetDir
 */
function copyRuntime(distroName, distroId, binPath, nodeDir, targetDir) {
  console.log(`Copying runtime for ${distroName} from ${nodeDir} to ${targetDir}`);
  const nodeSource = path.join(nodeDir, distroName, binPath);
  const distroDir = path.join(targetDir, distroId);
  fs.mkdirpSync(distroDir);
  const targetFile = path.join(distroDir, path.basename(binPath));
  console.log(`Copying runtime from ${nodeSource} to ${targetFile}`);
  fs.copySync(nodeSource, targetFile, { overwrite: true });
  return targetFile;
}

/**
 * Downloads the file at `url` and writes it to `file`
 *
 * Doesn't download the file if it already exists locally.
 *
 * @param {*} url
 * @param {*} file
 * @returns
 */

async function downloadFile(url, file, authToken) {
  if (fs.existsSync(file)) {
    console.log(`Skipping download. File ${file} already exists on disk.`);
    return;
  }
  console.log(`Downloading ${url} to ${file}`);
  const httpOptions = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {};
  const res = await fetch(url, httpOptions);

  if (!res.ok) {
    throw new Error(`Failed to download ${url}`);
  }

  const tempFile = `${file}.downloading`;
  fs.mkdirpSync(path.dirname(tempFile));
  const ws = fs.createWriteStream(tempFile);
  res.body.pipe(ws);

  return new Promise((resolve, reject) => {
    stream.finished(ws, err => {
      if (err) {
        fs.rmSync(tempFile);
        reject(`${err.message}`);
      } else {
        fs.moveSync(tempFile, file);
        console.log('Downloaded', file);
        resolve();
      }
    });
  });
}

/**
 * Extracts the file to the given directory
 *
 * @param {*} file
 * @param {*} dir
 */
async function extractFile(file, dir) {
  console.log(`Extracting ${file} to ${dir}`);
  if (file.endsWith('.zip')) {
    await extract(file, { dir });
  } else if (file.endsWith('.tar.gz')) {
    // decompress tar gz doesn't support overwrites
    deleteFolderIfExists(removeExtension(file));
    await tar.x({
      file,
      cwd: dir,
      /**
       * There are symlinks in the unix distros that raise an exception when running this on Windows
       * So we filter them out. We only need the binary which is in {distroFullName}/bin/node
       */
      filter: (_path, currentFile) => currentFile.path.endsWith('bin/node'),
    });
  } else {
    throw new Error(
      `Extraction not supported for file: ${file}. Please implement extraction for this extension`,
    );
  }
  console.log('Extracted');

  function deleteFolderIfExists(dirName) {
    if (fs.existsSync(dirName)) {
      fs.rmSync(dirName, { recursive: true, force: true });
    }
  }
}

/**
 * Removes the file extension from the archive
 *
 * @param {*} filename
 * @returns
 */
function removeExtension(filename) {
  let extensionLength;
  if (filename.endsWith('.zip')) {
    extensionLength = 4;
  } else if (filename.endsWith('.tar.xz') || filename.endsWith('.tar.gz')) {
    extensionLength = 7;
  } else {
    throw new Error(
      `File extension removal not supported for file: ${filename}. Please implement for its extension`,
    );
  }
  return filename.slice(0, -extensionLength);
}

/**
 * Retrieves the artifactory API key from ~/.npmrc if available (for dev env)
 * otherwise from ARTIFACTORY_ACCESS_TOKEN env variable (for CI)
 *
 * @returns
 */
function retrieveArtifactoryKey() {
  const devKey = retrieveForDevMachine();
  return devKey || retrieveForCI();

  function retrieveForCI() {
    return process.env.ARTIFACTORY_ACCESS_TOKEN;
  }

  function retrieveForDevMachine() {
    const npmrcFile = path.join(os.homedir(), '.npmrc');
    if (!fs.existsSync(npmrcFile)) {
      console.log(`NPM RC file ${npmrcFile} does not exist.`);
      return;
    }
    const npmrcContent = fs.readFileSync(npmrcFile, 'utf-8');
    const secondLine = npmrcContent?.split(/\r?\n/)[1];
    return secondLine?.split('authToken=')[1];
  }
}
