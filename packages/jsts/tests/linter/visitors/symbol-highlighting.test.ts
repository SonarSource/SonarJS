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
import { Linter } from 'eslint';
import { rule, SymbolHighlight } from '../../../src/linter/visitors';
import { Location } from '../../../src/linter/visitors/metrics/helpers';
import path from 'path';
import { parseTypeScriptSourceFile } from '../../tools';

describe('symbol highlighting rule', () => {
  it('should highlight variables', async () => {
    expect(await highlighting('variable.ts')).toEqual([
      symbol(declaration('1:4-1:5'), references('2:4-2:5', '3:4-3:5', '4:0-4:1')),
    ]);
  });

  it('should highlight unused variables', async () => {
    expect(await highlighting('unused.ts')).toEqual([symbol(declaration('1:4-1:5'), references())]);
  });

  it('should highlight typed variables', async () => {
    expect(await highlighting('typed.ts')).toEqual([symbol(declaration('1:4-1:5'), references())]);
  });

  it('should not highlight undeclared variables', async () => {
    expect(await highlighting('undeclared.ts')).toEqual([]);
  });

  it('should highlight parameters', async () => {
    expect(await highlighting('parameter.ts')).toEqual(
      expect.arrayContaining([
        symbol(declaration('1:9-1:12'), references()),
        symbol(declaration('1:13-1:14'), references('1:33-1:34')),
      ]),
    );
  });

  it('should highlight imported symbols', async () => {
    expect(await highlighting('imported.ts')).toEqual(
      expect.arrayContaining([symbol(declaration('1:9-1:10'), references('2:0-2:1'))]),
    );
  });

  it('should highlight curly brackets', async () => {
    const increasingOrder = (a, b) => a.declaration.startLine - b.declaration.startLine;
    expect((await highlighting('curly.ts')).sort(increasingOrder)).toEqual([
      symbol(declaration('1:13-1:14'), references('5:0-5:1')),
      symbol(declaration('2:12-2:13'), references('4:2-4:3')),
      symbol(declaration('3:11-3:12'), references('3:12-3:13')),
    ]);
  });

  it('should highlight constructors', async () => {
    expect(await highlighting('new.ts')).toEqual(
      expect.arrayContaining([symbol(declaration('1:4-1:5'), references('2:9-2:10', '4:10-4:11'))]),
    );
  });

  it('should highlight TypeScript enums', async () => {
    expect(await highlighting('enum.ts')).toEqual(
      expect.arrayContaining([symbol(declaration('1:5-1:6'), references())]),
    );
  });

  it('should highlight Vue templates', async () => {
    expect(await highlighting('template.vue')).toEqual([
      symbol(declaration('2:2-2:6'), references('4:2-4:7')),
      symbol(declaration('1:0-1:9'), references('5:0-5:10')),
    ]);
  });

  it('should highlight malformed Vue templates', async () => {
    expect(await highlighting('malformed.vue')).toEqual([
      symbol(declaration('1:0-1:9'), references('2:2-2:5')),
    ]);
  });
});

async function highlighting(fixture: string): Promise<SymbolHighlight[]> {
  const filePath = path.join(__dirname, 'fixtures', 'symbol-highlighting', fixture);
  const sourceCode = await parseTypeScriptSourceFile(filePath, []);

  const ruleId = 'symbol-highlighting';
  const rules = { [ruleId]: 'error' } as any;

  const linter = new Linter();
  linter.defineRule(ruleId, rule);

  const [message] = linter.verify(sourceCode, { rules });
  return JSON.parse(message.message) as SymbolHighlight[];
}

function symbol(declaration: Location, references: Location[]): SymbolHighlight {
  return { declaration, references };
}

function declaration(location: string): Location {
  return decode(location);
}

function references(...locations: string[]): Location[] {
  return locations.map(decode);
}

function decode(location: string): Location {
  const [start, end] = location.split('-');
  const [startLine, startCol] = start.split(':');
  const [endLine, endCol] = end.split(':');
  return {
    startLine: Number(startLine),
    startCol: Number(startCol),
    endLine: Number(endLine),
    endCol: Number(endCol),
  };
}
