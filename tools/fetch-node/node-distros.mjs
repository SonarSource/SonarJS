export const NODE_VERSION = 'v22.11.0';

const NODE_ORG_URL = `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}`;
const NODE_ARTIFACTORY_URL = `https://repox.jfrog.io/artifactory/nodejs-dist/${NODE_VERSION}/node-${NODE_VERSION}`;

// alpine builds are not officially supported. this is the URL the official docker alpine uses
// https://github.com/nodejs/docker-node/blob/15cd6b44e0284c459de7763b45e3b16972c0716e/22/alpine3.20/Dockerfile#L23
const UNOFFICIAL_NODE_ORG_URL = `https://unofficial-builds.nodejs.org/download/release/${NODE_VERSION}/node-${NODE_VERSION}`;
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
    sha: '905373a059aecaf7f48c1ce10ffbd5334457ca00f678747f19db5ea7d256c236',
    binPath: 'node.exe',
  },
  {
    id: 'darwin-arm64',
    url: `${NODE_ORG_URL}-darwin-arm64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-arm64.tar.gz`,
    sha: '2e89afe6f4e3aa6c7e21c560d8a0453d84807e97850bbb819b998531a22bdfde',
    binPath: 'bin/node',
  },
  {
    id: 'darwin-x64',
    url: `${NODE_ORG_URL}-darwin-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-x64.tar.gz`,
    sha: '668d30b9512137b5f5baeef6c1bb4c46efff9a761ba990a034fb6b28b9da2465',
    binPath: 'bin/node',
  },
  {
    id: 'linux-arm64',
    url: `${NODE_ORG_URL}-linux-arm64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-arm64.tar.gz`,
    sha: '27453f7a0dd6b9e6738f1f6ea6a09b102ec7aa484de1e39d6a1c3608ad47aa6a',
    binPath: 'bin/node',
  },
  {
    id: 'linux-x64',
    url: `${NODE_ORG_URL}-linux-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-x64.tar.gz`,
    sha: '4f862bab52039835efbe613b532238b6e4dde98d139a34e6923193e073438b13',
    binPath: 'bin/node',
  },
  {
    id: 'linux-x64-musl',
    url: `${UNOFFICIAL_NODE_ORG_URL}-linux-x64-musl.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-x64-musl.tar.gz`,
    sha: 'c9b4eba63f6569547e3a3423b446613a5a56dffb571b10f556bac2ae45fdc1fb',
    binPath: 'bin/node',
  },
];

export const VERSION_FILENAME = 'version.txt';
