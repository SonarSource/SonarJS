/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// Stateless operations for providers exposing the normalized SonarJS object contract.
const contract = require('../package.json');
/** @type {import('../contract.cjs').Constants} */
const constants = require('./constants.json');
/** @type {import('../contract.cjs').SyntaxBindings} */
const syntax = { ...require('./syntax.cjs'), ...require('./helpers.cjs') };
/** @type {import('../contract.cjs').CompilerBindings['versionMajorMinor']} */
const versionMajorMinor = contract.version.split('.').slice(0, 2).join('.');
module.exports = {
  ...constants,
  ...syntax,
  version: contract.version,
  versionMajorMinor,
};
