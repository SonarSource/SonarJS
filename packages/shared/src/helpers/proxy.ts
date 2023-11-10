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

/**
 * Proxies an object (useful for frozen objects which cannot be modified). Covers cases like
 * when the path to the value does not exist.
 *
 * @param target Object to be proxied
 * @param fqn path to the value that need to be overwritten
 * @param value value that will be returned instead of original
 */
export function createProxy(target: any, fqn: string[], value: any) {
  return new Proxy(target, {
    get(target: any, p: string | symbol): any {
      //https://stackoverflow.com/questions/41299642/how-to-use-javascript-proxy-for-nested-objects
      if (p === 'isProxy') {
        return true;
      }
      const key = p as keyof typeof target;

      const prop = target[key];

      if (key === fqn[0]) {
        if (fqn.length) {
          if (typeof prop == 'undefined') {
            return createObject(fqn.slice(1), value);
          }

          if (!prop.isProxy && typeof prop === 'object' && target[key] !== null) {
            return createProxy(prop, fqn.slice(1), value);
          }
        } else {
          return value;
        }
      }
      return target[key];
    },
  });
}

function createObject(fqn: string[], value: any) {
  const target: { [key: string]: any } = {};
  const key = fqn[0];
  if (fqn.length > 1) {
    target[key] = createObject(fqn.slice(1), value);
  } else {
    target[fqn[0]] = value;
  }
  return target;
}
