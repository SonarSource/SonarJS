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
import path from 'path';
import { generateIR, proto2text } from '../../src/dbd/helpers';
import fs from 'fs';
import { toUnixPath } from '@sonar/shared';

const baseDir = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(baseDir).filter(file => file.endsWith('.js'));

describe('DBD IR generation', () => {
  it('DBD rule should create correct IR', async () => {
    const filePath = path.join(baseDir, 'custom.js');
    const outDir = path.join(__dirname, 'ir', 'python');
    const signature = toUnixPath(filePath.slice(baseDir.length + 1)).replace(/\//g, '_');
    await generateIR(
      filePath,
      outDir,
      `function loadAll(pluginNames) {
             pluginNames(); // Noncompliant: pluginNames might be undefined
           }
           loadAll(null);`,
      false,
      baseDir,
    );
    const files = [
      path.join(outDir, 'ir0_custom___main__.ir'),
      path.join(outDir, 'ir0_custom_loadAll.ir'),
    ];
    const textIR = await proto2text(files);
    expect(textIR).toEqual(`#__main__ () {
bb0:
  null#0 = call #new-object#():foo
  #1 = call #set-field# globalThis(null#0, null#0):foo
  #2 = call #set-field# NaN(null#0, NaN#3):foo
  #4 = call #set-field# Infinity(null#0, Infinity#5):foo
  #6 = call #set-field# undefined(null#0, undefined#7):foo
  br bb1
bb1:
  #8 = call #new-object#():foo
  #9 = call ${signature}.loadAll(#-1):foo
  return #-1
}

loadAll (pluginNames#9) {
bb0:
  null#0 = call #new-object#():foo
  #1 = call #set-field# globalThis(null#0, null#0):foo
  #2 = call #set-field# NaN(null#0, NaN#3):foo
  #4 = call #set-field# Infinity(null#0, Infinity#5):foo
  #6 = call #set-field# undefined(null#0, undefined#7):foo
  br bb1
bb1:
  #8 = call #new-object#():foo
  br bb2
bb2:
  #10 = call #new-object#():foo
  #11 = call ${signature}.pluginNames():foo
  br bb3
bb3:
  return #-1
}

`);
  });

  it.each(files)('should process %s', async filePath => {
    const outDir = path.join(__dirname, 'ir', 'python');
    await generateIR(path.join(baseDir, filePath), outDir);
  });
});
