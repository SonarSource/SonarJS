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
// The actual compiler implementation is private to this provider.
const compiler = require('typescript-classic');
// Some published-rule compatibility tests use the upstream project service.
// Keep its implementation lazy; analysis uses SonarJS-owned program selection.
const server = new Proxy(Object.create(null), {
  get(_target, name) {
    return require('typescript-classic/lib/tsserverlibrary.js').server[name];
  },
});
module.exports = new Proxy(compiler, {
  get(target, name) {
    return name === 'server' ? server : target[name];
  },
});
