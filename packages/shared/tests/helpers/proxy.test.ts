/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import {
  resetCounters,
  createProxy,
  proxiesCounter,
  isProxy,
  isGhostObject,
  ghostObjectCounter,
} from '../../src/helpers';

describe('proxy', () => {
  beforeEach(() => {
    resetCounters();
  });
  it('should proxy an object', () => {
    expect(proxiesCounter).toEqual(0);
    const obj = { a: 1 } as any;
    freezeDeeply(obj);
    expect(() => (obj.b = 0)).toThrow(TypeError);
    const objProxy = createProxy(obj, ['b'], 0);
    expect(objProxy.b).toEqual(0);
    expect(objProxy[isProxy]).toEqual(true);
    expect(proxiesCounter).toEqual(1);
  });
  it('should proxy non-existing nested object', () => {
    expect(proxiesCounter).toEqual(0);
    const obj = { a: 1 } as any;
    freezeDeeply(obj);
    expect(() => (obj.b = { c: { d: 1 } })).toThrow(TypeError);
    const objProxy = createProxy(obj, ['b', 'c', 'd'], 1);
    expect(objProxy.b.c.d).toEqual(1);

    expect(objProxy[isProxy]).toEqual(true);
    expect(objProxy.b[isGhostObject]).toEqual(true);
    expect(objProxy.b.c[isGhostObject]).toEqual(true);
    expect(proxiesCounter).toEqual(1);
    expect(ghostObjectCounter).toEqual(2);
  });
  it('should proxy existing nested object', () => {
    expect(proxiesCounter).toEqual(0);
    const objProto = { b: { c: {} } } as any;
    const obj = Object.create(objProto);
    obj.a = 1;
    freezeDeeply(obj);
    expect(() => (obj.b = { c: { d: 1 } })).toThrow(TypeError);
    const objProxy = createProxy(obj, ['b', 'c', 'd'], 1);
    expect(objProxy.b.c.d).toEqual(1);

    expect(objProxy[isProxy]).toEqual(true);
    expect(objProxy.b[isProxy]).toEqual(true);
    expect(objProxy.b.c[isProxy]).toEqual(true);
    expect(proxiesCounter).toEqual(3);
    expect(ghostObjectCounter).toEqual(0);
  });
});

function freezeDeeply(x: any) {
  if (typeof x === 'object' && x !== null) {
    if (Array.isArray(x)) {
      x.forEach(freezeDeeply);
    } else {
      for (const key in x) {
        if (x.hasOwnProperty(key)) {
          freezeDeeply(x[key]);
        }
      }
    }
    Object.freeze(x);
  }
}
