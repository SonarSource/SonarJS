import fetch from 'node-fetch';
import fs from 'fs-extra';
import extract from 'extract-zip';
import decompress from 'decompress';
//import decompressTarxz from 'decompress-tarxz';
import decompressTargz from 'decompress-targz';
import * as path from 'node:path';
import * as stream from 'node:stream';

/**
 * Fetches node.js runtimes and downloads them to
 * targetDir/classes/{distro.id}/node{.exe}
 */

const NODE_VERSION = 'v20.5.1';

const NODE_DISTROS = [
  {
    id: 'win-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
  },
  {
    id: 'macos-arm64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-arm64.tar.gz`,
  },
  {
    id: 'linux-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz`,
  },
  // unofficial-builds throttles downloads
  {
    id: 'linux-x64-alpine',
    url: `https://unofficial-builds.nodejs.org/download/release/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64-musl.tar.gz`,
  },
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

const targetDir = PARAM_DIR ?? DEFAULT_TARGET_DIR;
const nodeDir = path.join(targetDir, 'node');
fs.mkdirpSync(nodeDir);

for (const distro of NODE_DISTROS) {
  const filename = getFilenameFromUrl(distro.url);
  const archiveFilename = path.join(nodeDir, filename);
  await downloadFile(distro.url, archiveFilename);
  await extractFile(archiveFilename, nodeDir);

  const distroName = removeExtension(filename);
  copyRuntime(distroName, distro.id, nodeDir, targetDir);
}

function getFilenameFromUrl(url) {
  const parts = url.split('/');
  return parts[parts.length - 1];
}

/**
 * Copies the node runtime executable from nodeDir based on the distribution
 * file organization into `targetDir/classes/distroId/node{.exe}`
 *
 * @param {*} distroName
 * @param {*} distroId
 * @param {*} nodeDir
 * @param {*} targetDir
 */
function copyRuntime(distroName, distroId, nodeDir, targetDir) {
  console.log(`Copying runtime for ${distroName} from ${nodeDir} to ${targetDir}`);
  let nodeBin;
  if (distroName.includes('win-x64')) {
    nodeBin = 'node.exe';
  } else if (distroName.includes('darwin-arm64') || distroName.includes('linux-x64')) {
    nodeBin = path.join('bin', 'node');
  } else {
    throw new Error(
      `Distribution ${distroName} unknown. Implement support for its internal file structure`,
    );
  }
  const nodeSource = path.join(nodeDir, distroName, nodeBin);
  const classesDir = path.join(targetDir, 'classes', distroId);
  fs.mkdirpSync(classesDir);
  const targetFile = path.join(classesDir, keepOnlyFile(nodeBin));
  console.log(`Copying runtime from ${nodeSource} to ${targetFile}`);
  fs.copySync(nodeSource, targetFile, { overwrite: true });

  function keepOnlyFile(fullPath) {
    const parts = fullPath.split(path.sep);
    return parts[parts.length - 1];
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
 * Downloads the file at `url` and writes it to `file`
 *
 * Doesn't download the file if it already exists locally.
 *
 * @param {*} url
 * @param {*} file
 * @returns
 */
async function downloadFile(url, file) {
  if (fs.existsSync(file)) {
    console.log(`File ${file} already exists on disk. Skipping download.`);
    return;
  }
  console.log(`Downloading ${url} to ${file}`);
  const res = await fetch(url);

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
    await decompress(file, dir, {
      plugins: [decompressTargz()],
      filter: currentFile => {
        /**
         * There are symlinks in the unix distros that raise an exception when running this on Windows
         * So we filter them out. We only need the binary which is in <distroFullName>/bin/node
         */
        return currentFile.path.endsWith('bin/node') || currentFile.path.endsWith('bin');
      },
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
