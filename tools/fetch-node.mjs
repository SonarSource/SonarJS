import fetch from 'node-fetch';
import fs from 'fs-extra';
import extract from 'extract-zip';
import decompress from 'decompress';
import decompressTarxz from 'decompress-tarxz';
import * as path from 'node:path';
import * as stream from 'node:stream';

const NODE_DISTROS_URLS = [
  'https://nodejs.org/dist/v20.5.1/node-v20.5.1-win-x64.zip',
  'https://nodejs.org/dist/v20.5.1/node-v20.5.1-darwin-arm64.tar.xz',
  'https://nodejs.org/dist/v20.5.1/node-v20.5.1-linux-x64.tar.xz',
  // unofficial-builds throttles downloads
  'https://unofficial-builds.nodejs.org/download/release/v20.5.1/node-v20.5.1-linux-x64-musl.tar.xz',
];

/**
 * This script accepts a custom target directory
 */
const PARAM_DIR = readTargetDirFromCLI();
const DEFAULT_TARGET_DIR = path.join(
  process.cwd(),
  'sonar-plugin',
  'sonar-javascript-plugin',
  'target',
);

const targetDir = PARAM_DIR || DEFAULT_TARGET_DIR;
const nodeDir = path.join(targetDir, 'node');
fs.mkdirpSync(nodeDir);

for (const distroUrl of NODE_DISTROS_URLS) {
  const filename = distroUrl.split(path.sep).at(-1);
  const archiveFilename = path.join(nodeDir, filename);
  await downloadFile(distroUrl, archiveFilename);
  await extractFile(archiveFilename, nodeDir);

  const distroName = removeExtension(filename);
  copyRuntime(distroName, nodeDir, targetDir);
}

/**
 * Extracts runtime executable from nodeDir based on the distribution
 * and copies it in targetDir/classes/distroName/node{.exe}
 *
 * @param {*} distroName
 * @param {*} nodeDir
 * @param {*} targetDir
 */
function copyRuntime(distroName, nodeDir, targetDir) {
  console.log(`Copying runtime for ${distroName} from ${nodeDir} to ${targetDir}`);
  let nodeBin;
  if (distroName.includes('win-x64')) {
    nodeBin = 'node.exe';
  } else if (distroName.includes('darwin-arm64') || distroName.includes('linux-x64')) {
    nodeBin = path.join('bin', 'node');
  } else {
    throw new Error(
      `Distribution ${distroName} unkown. Implement support for its internal file structure`,
    );
  }
  const nodeSource = path.join(nodeDir, distroName, nodeBin);
  const classesDir = path.join(targetDir, 'classes', distroName);
  fs.mkdirpSync(classesDir);
  const targetFile = path.join(classesDir, keepOnlyFile(nodeBin));
  console.log(`Copying runtime from ${nodeSource} to ${targetFile}`);
  fs.copySync(nodeSource, targetFile, { overwrite: true });

  function keepOnlyFile(fullPath) {
    return fullPath.split(path.sep).at(-1);
  }
}

/**
 * Removes the file extension from the archvie
 *
 * @param {*} filename
 * @returns
 */
function removeExtension(filename) {
  if (filename.endsWith('.zip')) {
    return filename.slice(0, -4);
  } else if (filename.endsWith('.tar.xz')) {
    return filename.slice(0, -7);
  } else {
    throw new Error(
      `File extension removal not supported for file: ${filename}. Please implement for its extension`,
    );
  }
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
async function downloadFile(url, file) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  if (fs.existsSync(file)) {
    return;
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
 * Extracts the file
 *
 * @param {*} file
 */
async function extractFile(file, dir) {
  console.log(`Extracting ${file} to ${dir}`);
  if (file.endsWith('.zip')) {
    await extract(file, { dir });
  } else if (file.endsWith('.tar.xz')) {
    // decompress tar xz doesn't support overwrites
    deleteFolderIfExists(removeExtension(file));
    await decompress(file, dir, {
      plugins: [decompressTarxz()],
    });
  } else {
    throw new Error(
      `decompression not supported for file: ${file}. Please implement decompression for its extension`,
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
 * Reads the first CLI parameter
 * If the path is relative, makes it absolute
 *
 * @returns
 */
function readTargetDirFromCLI() {
  const folder = process.argv.length > 2 ? process.argv[2] : undefined;
  if (!folder) return undefined;

  if (isAbsolutePath(folder)) {
    return folder;
  }

  return path.join(process.cwd(), folder);

  function isAbsolutePath(folder) {
    return folder.startsWith(path.sep);
  }
}
