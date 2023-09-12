const NODE_VERSION = 'v20.5.1';

/**
 * Node.js runtimes distributions
 *
 * Keep ids in sync with tools/fetch-node/pom.xml
 */
export default [
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
];
