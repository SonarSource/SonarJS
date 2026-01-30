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
import { Volume } from 'memfs';
import { equal } from 'node:assert';
import type { Filesystem } from '../../../src/rules/helpers/find-up/find-minimatch.js';
import { patternInParentsCache } from '../../../src/rules/helpers/find-up/all-in-parent-dirs.js';
import type { UnixPath } from '../../../src/rules/helpers/files.js';
import Path from 'node:path/posix';
import { beforeEach, describe, it } from 'node:test';

/** Helper to cast string literals to UnixPath for tests */
const path = (p: string) => p as UnixPath;

describe('findUp', () => {
  beforeEach(() => patternInParentsCache.clear());
  it('only touches the filesystem when needed', ({ mock }) => {
    const filesystem = Volume.fromJSON({
      '/a/b/c/d/foo.bar': '/a/b/c/d/foo.bar content',
      '/a/b/c/foo.bar': '/a/b/c/foo.bar content',
      '/a/foo.bar': '/a/foo.bar content',
    });
    console.log(filesystem.toJSON());

    const findUp = patternInParentsCache.get('foo.bar', filesystem as Filesystem).get('/');

    const filesystemReadFileSpy = mock.method(filesystem, 'readFileSync');
    const filesystemReaddirSpy = mock.method(filesystem, 'readdirSync');

    const abcEntries = findUp.get(path('/a/b/c'));
    const abcEntries2 = findUp.get(path('/a/b/c'));
    const abcEntries3 = findUp.get(path('/a/b/c'));
    const abcEntries4 = findUp.get(path('/a/b/c'));
    findUp.get(path('/a/b'));

    equal(filesystemReadFileSpy.mock.calls.length, 2);
    equal(filesystemReaddirSpy.mock.calls.length, 4);

    const filesystemReaddirSpyCallArgs = filesystemReaddirSpy.mock.calls;

    equal(filesystemReaddirSpyCallArgs[0].arguments[0], Path.join('/', 'a', 'b', 'c'));
    equal(filesystemReaddirSpyCallArgs[1].arguments[0], Path.join('/', 'a', 'b'));
    equal(filesystemReaddirSpyCallArgs[2].arguments[0], Path.join('/', 'a'));
    equal(filesystemReaddirSpyCallArgs[3].arguments[0], Path.join('/'));

    for (const entries of [abcEntries, abcEntries2, abcEntries3, abcEntries4]) {
      equal(entries.length, 2);
      equal(entries[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
      equal(entries[0].content.toString(), '/a/b/c/foo.bar content');
      equal(entries[1].path, Path.join('/', 'a', 'foo.bar'));
      equal(entries[1].content.toString(), '/a/foo.bar content');
    }

    equal(filesystemReadFileSpy.mock.calls.length, 2);
    equal(filesystemReaddirSpy.mock.calls.length, 4);

    findUp.get(path('/a/b/c/d'));

    equal(filesystemReadFileSpy.mock.calls.length, 3);
    equal(filesystemReaddirSpy.mock.calls.length, 5);
  });

  it('honors the threshold', () => {
    const filesystem = Volume.fromJSON({
      '/a/b/c/foo.bar': '/a/b/c/foo.bar content',
      '/a/foo.bar': '/a/foo.bar content',
      '/foo.bar': '/foo.bar content',
    });

    const entriesUpToRoot = patternInParentsCache
      .get('foo.bar', filesystem as Filesystem)
      .get('/')
      .get(path('/a/b/c'));
    const entriesUpToA = patternInParentsCache
      .get('foo.bar', filesystem as Filesystem)
      .get('/a')
      .get(path('/a/b/c'));
    const entriesUpToAB = patternInParentsCache
      .get('foo.bar', filesystem as Filesystem)
      .get('/a/b')
      .get(path('/a/b/c'));

    equal(entriesUpToRoot.length, 3);
    equal(entriesUpToRoot[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
    equal(entriesUpToRoot[1].path, Path.join('/', 'a', 'foo.bar'));
    equal(entriesUpToRoot[2].path, Path.join('/', 'foo.bar'));
    equal(entriesUpToA.length, 2);
    equal(entriesUpToA[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
    equal(entriesUpToA[1].path, Path.join('/', 'a', 'foo.bar'));
    equal(entriesUpToAB.length, 1);
    equal(entriesUpToAB[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
  });

  it('honors the glob pattern', () => {
    const filesystem = Volume.fromJSON({
      '/a/b/c/foo.bar': '/a/b/c/foo.bar content',
      '/a/foo.x.bar': '/a/foo.bar content',
      '/foo.y.bar': '/foo.bar content',
    });

    const entriesUpToRoot = patternInParentsCache
      .get('foo.{*.,}bar', filesystem as Filesystem)
      .get('/')
      .get(path('/a/b/c'));
    const entriesUpToA = patternInParentsCache
      .get('foo.{*.,}bar', filesystem as Filesystem)
      .get('/a')
      .get(path('/a/b/c'));
    const entriesUpToAB = patternInParentsCache
      .get('foo.{*.,}bar', filesystem as Filesystem)
      .get('/a/b')
      .get(path('/a/b/c'));

    equal(entriesUpToRoot.length, 3);
    equal(entriesUpToRoot[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
    equal(entriesUpToRoot[1].path, Path.join('/', 'a', 'foo.x.bar'));
    equal(entriesUpToRoot[2].path, Path.join('/', 'foo.y.bar'));
    equal(entriesUpToA.length, 2);
    equal(entriesUpToA[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
    equal(entriesUpToA[1].path, Path.join('/', 'a', 'foo.x.bar'));
    equal(entriesUpToAB.length, 1);
    equal(entriesUpToAB[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
  });
});
