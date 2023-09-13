const NODE_VERSION = 'v20.5.1';

/**
 * Node.js runtimes distributions
 *
 * Keep ids in sync with
 * - `tools/fetch-node/pom.xml`
 * - `sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/bridge/EmbeddedNode.java`
 */
export default [
  {
    id: 'win-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
    artifactoryUrl: `https://repox.jfrog.io/artifactory/nodejs-dist/${NODE_VERSION}/node-${NODE_VERSION}-win-x64.zip`,
    sha: '5d2596a00699fadf0ffa8e651f47ff5d719991014b920544d59c80d78569d42f',
  },
  {
    id: 'macos-arm64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    artifactoryUrl: `https://repox.jfrog.io/artifactory/nodejs-dist/${NODE_VERSION}/node-${NODE_VERSION}-darwin-arm64.tar.gz`,
    sha: '9cc794517788aee103dfcffa04d0b90ac33854b0d10eb11a26ba4be38403f731',
  },
  {
    id: 'linux-x64',
    url: `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz`,
    artifactoryUrl: `https://repox.jfrog.io/artifactory/nodejs-dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz`,
    sha: 'a8678ae00425acdf692e943e3f1cea11a4c46281e4257b82886423bd4ef6f2b5',
  },
];
