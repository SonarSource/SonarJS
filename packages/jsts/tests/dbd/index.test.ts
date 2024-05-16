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

const baseDir = path.join(__dirname, 'fixtures');

describe('DBD IR generation', () => {
  it('DBD rule should create correct IR', async () => {
    const filePath = path.join(baseDir, 'custom.js');
    const outDir = path.join(__dirname, 'ir', 'python');
    await generateIR(
      filePath,
      outDir,
      `function loadAll(pluginNames) {
             pluginNames(); // Noncompliant: pluginNames might be undefined
           }
           loadAll(null);`,
    );
    const files = [path.join(outDir, 'custom_main.ir'), path.join(outDir, 'custom_0.ir')];
    const textIR = await proto2text(files);
    expect(textIR).toEqual(`custom.#__main__ () {
bb0:
  #1 = call custom.loadAll(null#0)
  return null#0
}
custom.loadAll (pluginNames#1) {
bb0:
  #2 = call custom.pluginNames()
  return null#0
}
`);
  });
});