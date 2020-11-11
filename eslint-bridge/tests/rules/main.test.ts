/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import * as fs from 'fs';
import { rules } from 'rules/main';
import { Linter, SourceCode } from 'eslint';
import { parseTypeScriptSourceFile } from '../../src/parser';
import { rule as secondaryLocation } from 'rules/secondary-location';

describe('Secondary location support', () => {
  it('should be enabled for rules using secondary locations', () => {
    const rulesMissingSecondaryLocationEnabling = [];
    const linter = new Linter();
    linter.defineRule('secondary-location', secondaryLocation);
    Object.keys(rules).forEach(rule => {
      const filePath = `${__dirname}/../../src/rules/${rule}.ts`;
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
      const sourceCode = parseTypeScriptSourceFile(fileContent, filePath, []) as SourceCode;
      const issues = linter.verify(sourceCode, { rules: { 'secondary-location': 'error' } });
      if (issues.length > 0) {
        rulesMissingSecondaryLocationEnabling.push(rule);
      }
    });
    expect(rulesMissingSecondaryLocationEnabling).toHaveLength(0);
  });
});
