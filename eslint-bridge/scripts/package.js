#!/usr/bin/env node

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

async function jar() {
    const {stdout: packOut, stderr: packErr} = await exec('npm pack');
    console.error(packErr);
    const packageFilename = packOut.trim();
    if (!fs.existsSync(packageFilename)) {
        throw new Error(`${packageFilename} doesn't exists!`);
    }

    const {stdout: installOut, stderr: installErr} = await exec(`npm install --prefix target/classes ${packageFilename}`);
    console.log('stdout:', installOut);
    console.error(installErr);
    fs.unlinkSync(packageFilename);
}

jar().catch(e => {
    console.error(e);
    process.exit(1);
});
