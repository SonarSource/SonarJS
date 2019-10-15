const util = require('util');
const exec = util.promisify(require('child_process').exec);
const https = require('https');

const repo = /* process.env.CIRRUS_REPO_FULLNAME */ 'SonarSource/SonarJS';
const buildId =  /* process.env.CIRRUS_BUILD_ID */ 5678932581416960;
const functionUrl = 'https://us-central1-ci-cd-215716.cloudfunctions.net';

function getBuildNumber() {
  return new Promise(((resolve, reject) => {
    https.get(`${functionUrl}/cirrusBuildNumber/${repo}/${buildId}`, {
      headers: {
        'Authorization': 'Bearer ABCDE'
      },
      timeout: 5000
    }, (res) => {
      const {statusCode} = res;

      if (statusCode !== 200) {
        const error = new Error(`Status Code: ${statusCode}`);
        res.resume();
        reject(error);
      }

      let data = "";
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (e) => {
      reject(e);
    });
  }));
}

async function setVersion(newVersion) {
  await exec(`mvn org.codehaus.mojo:versions-maven-plugin:2.7:set -DnewVersion=${newVersion} -DgenerateBackupPoms=false -B -e`);
}

async function getCurrentVersion() {
  const {stdout, stderr} = await exec('mvn.cmd -q -Dexec.executable=node -Dexec.args="-e console.log(process.argv[1]) ${project.version}" --non-recursive org.codehaus.mojo:exec-maven-plugin:1.3.1:exec');
  return stdout.trim();
}

getBuildNumber().then(async (buildNumber) => {
  console.log(`Build number ${buildNumber}`);
  const currentVersion = await getCurrentVersion();
  if (!currentVersion.endsWith("-SNAPSHOT")) {
    throw new Error(`Not a snapshot ${currentVersion}`);
  }
  const newVersion = currentVersion.replace("-SNAPSHOT", buildNumber);
  console.log(`Setting version ${newVersion}`);
  await setVersion(newVersion);
});

