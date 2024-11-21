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
const rules = require('./lib').rules;

/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  urlRuleDoc(name) {
    return rules[name].meta.docs.url;
  },
  postprocess: content => content.replace('<table>', '&lt;table&gt;'),
  ignoreConfig: ['recommended-legacy'],
  pathRuleDoc(name) {
    return `docs/${name}.md`;
  },
  pathRuleList: '../packages/jsts/src/rules/README.md',
  ruleListColumns: [
    'name',
    'description',
    'configsError',
    'fixable',
    'hasSuggestions',
    'requiresTypeChecking',
    'deprecated',
  ],
};

module.exports = config;
