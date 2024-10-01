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
import esprima from 'esprima';
import estree from 'estree';
import { Mocha } from '../../../src/rules/index.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';

describe('Mocha.js', () => {
  it('should recognize test constructs', () => {
    const program = esprima.parse(`it('foo', () => {})`);
    const node: estree.Node = program.body[0].expression;
    expect(Mocha.isTestConstruct(node)).toEqual(true);
  });

  it('should recognize special test constructs', () => {
    const program = esprima.parse(`it.only('foo', () => {})`);
    const node: estree.Node = program.body[0].expression;
    expect(Mocha.isTestConstruct(node)).toEqual(true);
  });

  it('should not recognize garbage', () => {
    const program = esprima.parse(`'foo'`);
    const node: estree.Node = program.body[0].expression;
    expect(Mocha.isTestConstruct(node)).toEqual(false);
  });
});
