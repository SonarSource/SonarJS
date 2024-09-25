export const NODE_VERSION = 'v20.17.0';

const NODE_ORG_URL = `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}`;
const NODE_ARTIFACTORY_URL = `https://repox.jfrog.io/artifactory/nodejs-dist/${NODE_VERSION}/node-${NODE_VERSION}`;

/**
 * Node.js runtimes distributions
 *
 * Keep ids in sync with:
 * - `tools/fetch-node/pom.xml`
 * - `sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/bridge/EmbeddedNode.java`
 * - `sonar-plugin/sonar-javascript-plugin/pom.xml`
 */
export const DISTROS = [
  {
    id: 'win-x64',
    url: `${NODE_ORG_URL}-win-x64.zip`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-win-x64.zip`,
    sha: 'e323fff0aba197090faabd29c4c23f334557ff24454324f0c83faa7e399dbb74',
    binPath: 'node.exe',
  },
  {
    id: 'darwin-arm64',
    url: `${NODE_ORG_URL}-darwin-arm64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-arm64.tar.gz`,
    sha: '476324108c4361935465631eec47df1c943ba2c87bc050853385b1d1c71f0b1f',
    binPath: 'bin/node',
  },
  {
    id: 'darwin-x64',
    url: `${NODE_ORG_URL}-darwin-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-x64.tar.gz`,
    sha: 'eefe9447dbb0b5b233d42730989c6c364487de4043145db2f63da94e9623c380',
    binPath: 'bin/node',
  },
  {
    id: 'linux-arm64',
    url: `${NODE_ORG_URL}-linux-arm64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-arm64.tar.gz`,
    sha: '18afbf2781edfcc9918343f4bf74a8c35d74d778b85d40a0c09b232adc0ea82c',
    binPath: 'bin/node',
  },
  {
    id: 'linux-x64',
    url: `${NODE_ORG_URL}-linux-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-x64.tar.gz`,
    sha: '21e656f6f4e34080ddc5d75fbfe58ce8482fe6e70a76aeae14afdcdc1e23079d',
    binPath: 'bin/node',
  },
];

export const VERSION_FILENAME = 'version.txt';
