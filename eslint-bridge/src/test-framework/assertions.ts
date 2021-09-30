/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

import { RuleTester } from 'eslint';
import { readFileSync } from 'fs';
import { FileIssues } from './issues';

interface Tests {
  valid?: (string | RuleTester.ValidTestCase)[];
  invalid?: RuleTester.InvalidTestCase[];
}

export function readAssertions(filePath: string): Tests {
  const fileContent = readFileSync(filePath, { encoding: 'utf8' });
  const expectedIssues = new FileIssues(fileContent).getExpectedIssues();
  const errors: RuleTester.TestCaseError[] = expectedIssues.map(i => {
    return {
      message: i.messages[0],
      ...i.primaryLocation?.range,
    };
  });
  console.log(`asserting ${errors.length} issues`);
  return { valid: [], invalid: [{ code: fileContent, errors }] };
}
