import fetch from 'node-fetch';
import fs from 'fs-extra';
import extract from 'extract-zip';
import * as path from 'node:path';
import * as stream from 'node:stream';

const DOWNLOAD_URL = 'https://nodejs.org/dist/';
const NODE_VERSION = 'v20.5.1';
const NODE_OS = ['win'];
const NODE_ARCH = ['x64'];

async function downloadUrl(url, file) {
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
        resolve();
      }
    });
  });
}

const file = `node-${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}`;
const targetDir = path.join(process.cwd(), 'sonar-plugin', 'sonar-javascript-plugin', 'target');
const nodeDir = path.join(targetDir, 'node');
fs.mkdirpSync(nodeDir);
const nodeZip = path.join(nodeDir, `${file}.zip`);
await downloadUrl(`${DOWNLOAD_URL}/${NODE_VERSION}/${file}.zip`, nodeZip);
await extract(nodeZip, { dir: nodeDir });
const nodeExe = 'node.exe';
const nodeBin = path.join(nodeDir, file, nodeExe);
const classesDir = path.join(targetDir, 'classes');
fs.mkdirpSync(classesDir);
fs.copySync(nodeBin, path.join(classesDir, nodeExe));
