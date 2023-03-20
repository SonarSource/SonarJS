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
export class LRU<T> {
  private readonly max: number;
  private readonly cache: T[];
  constructor(max = 5) {
    this.max = max;
    this.cache = [];
  }

  get() {
    return this.cache;
  }

  set(item: T) {
    const index = this.cache.indexOf(item);
    if (index >= 0) {
      this.cache.splice(index, 1);
    }
    this.cache.push(item);
    if (this.cache.length > this.max) {
      this.cache.shift();
    }
  }
}
