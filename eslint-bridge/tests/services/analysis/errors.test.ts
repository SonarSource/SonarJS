/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import { parseAnalysisErrorCode, AnalysisErrorCode } from 'services/analysis';

describe('parseAnalysisErrorCode', () => {
  it('should decode parsing errors', () => {
    expect(parseAnalysisErrorCode('Unexpected token )')).toEqual(AnalysisErrorCode.Parsing);
  });

  it('should decode missing TypeScript errors', () => {
    expect(parseAnalysisErrorCode("Cannot find module 'typescript'")).toEqual(
      AnalysisErrorCode.MissingTypeScript,
    );
  });

  it('should decode unsupported TypeScript errors', () => {
    expect(parseAnalysisErrorCode('You are using version of TypeScript')).toEqual(
      AnalysisErrorCode.UnsupportedTypeScript,
    );
  });

  it('should decode runtime TypeScript errors', () => {
    expect(parseAnalysisErrorCode('Debug Failure. TypeScript unexpectedly failed')).toEqual(
      AnalysisErrorCode.FailingTypeScript,
    );
  });
});
