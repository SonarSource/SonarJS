#!/usr/bin/env node

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function jar() {
    const {stdout: packOut, stderr: packErr} = await exec('npm pack');
    console.error(packErr);
    const packagePath = path.resolve(packOut.trim());
    if (!fs.existsSync(packagePath)) {
        throw new Error(`${packagePath} doesn't exists!`);
    }
    const eslintBridgeDir = process.cwd();
    const tmpdir = getTmpDir();
    process.chdir(tmpdir);
    console.log('calling npm install in', tmpdir);
    console.log(packagePath);
    const {stdout: installOut, stderr: installErr} = await exec(`npm install ${packagePath}`);
    console.log(installOut);
    console.error(installErr);
    fs.copySync(tmpdir, path.join(eslintBridgeDir, 'target', 'classes'));
    fs.unlinkSync(packagePath);
}


function getTmpDir() {
    const tmpdir = path.join(os.tmpdir(), "eslint-bridge");
    if (fs.existsSync(tmpdir)) {
        fs.removeSync(tmpdir);
    }
    fs.ensureDirSync(tmpdir);
    return tmpdir;
}

jar().catch(e => {
    console.error(e);
    process.exit(1);
});
