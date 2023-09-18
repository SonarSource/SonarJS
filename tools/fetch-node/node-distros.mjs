export const NODE_VERSION = 'v20.5.1';

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
    sha: '5d2596a00699fadf0ffa8e651f47ff5d719991014b920544d59c80d78569d42f',
  },
  {
    id: 'darwin-arm64',
    url: `${NODE_ORG_URL}-darwin-arm64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-arm64.tar.gz`,
    sha: '9cc794517788aee103dfcffa04d0b90ac33854b0d10eb11a26ba4be38403f731',
  },
  {
    id: 'linux-x64',
    url: `${NODE_ORG_URL}-linux-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-x64.tar.gz`,
    sha: 'a8678ae00425acdf692e943e3f1cea11a4c46281e4257b82886423bd4ef6f2b5',
  },
];

export const VERSION_FILENAME = 'version.txt';
