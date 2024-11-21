/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
export const NODE_VERSION = 'v22.11.0';

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
];

export const VERSION_FILENAME = 'version.txt';
