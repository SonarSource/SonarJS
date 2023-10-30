export const NODE_VERSION = 'v20.9.0';

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
    sha: '70d87dad2378c63216ff83d5a754c61d2886fc39d32ce0d2ea6de763a22d3780',
  },
  {
    id: 'darwin-arm64',
    url: `${NODE_ORG_URL}-darwin-arm64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-arm64.tar.gz`,
    sha: '31d2d46ae8d8a3982f54e2ff1e60c2e4a8e80bf78a3e8b46dcaac95ac5d7ce6a',
  },
  {
    id: 'darwin-x64',
    url: `${NODE_ORG_URL}-darwin-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-darwin-x64.tar.gz`,
    sha: 'fc5b73f2a78c17bbe926cdb1447d652f9f094c79582f1be6471b4b38a2e1ccc8',
  },
  {
    id: 'linux-x64',
    url: `${NODE_ORG_URL}-linux-x64.tar.gz`,
    artifactoryUrl: `${NODE_ARTIFACTORY_URL}-linux-x64.tar.gz`,
    sha: 'f0919f092fbf74544438907fa083c21e76b2d7a4bc287f0607ada1553ef16f60',
  },
];

export const VERSION_FILENAME = 'version.txt';
