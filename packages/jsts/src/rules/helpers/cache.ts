/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
export class ComputedCache<K, V, TContext = null> {
  private readonly cache: Map<K, V>;

  constructor(private readonly computeFn: (key: K, context?: TContext) => V) {
    this.cache = new Map();
  }

  get(key: K, context?: TContext) {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const value = this.computeFn(key, context);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V) {
    this.cache.set(key, value);
  }

  has(key: K) {
    return this.cache.has(key);
  }

  delete(key: K) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}
