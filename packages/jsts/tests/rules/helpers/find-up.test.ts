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
import { Volume } from 'memfs';
import { equal } from 'node:assert';
import { createFindUp } from '../../../src/rules/helpers/find-up';
import Path from 'path/posix';
import { jest } from '@jest/globals';

describe('findUp', () => {
  it('only touches the filesystem when needed', () => {
    const filesystem = Volume.fromJSON({
      '/a/b/c/d/foo.bar': '/a/b/c/d/foo.bar content',
      '/a/b/c/foo.bar': '/a/b/c/foo.bar content',
      '/a/foo.bar': '/a/foo.bar content',
    });

    const findUp = createFindUp('foo.bar');

    const filesystemReadFileSpy = jest.spyOn(filesystem, 'readFileSync');
    const filesystemReaddirSpy = jest.spyOn(filesystem, 'readdirSync');

    const abcEntries = findUp('/a/b/c', '/', filesystem);
    const abcEntries2 = findUp('/a/b/c', '/', filesystem);
    const abcEntries3 = findUp('/a/b/c', '/', filesystem);
    const abcEntries4 = findUp('/a/b/c', '/', filesystem);

    equal(filesystemReadFileSpy.mock.calls.length, 2);
    equal(filesystemReaddirSpy.mock.calls.length, 4);

    const filesystemReaddirSpyCallArgs = filesystemReaddirSpy.mock.calls;

    equal(filesystemReaddirSpyCallArgs[0][0], Path.join('/', 'a', 'b', 'c'));
    equal(filesystemReaddirSpyCallArgs[1][0], Path.join('/', 'a', 'b'));
    equal(filesystemReaddirSpyCallArgs[2][0], Path.join('/', 'a'));
    equal(filesystemReaddirSpyCallArgs[3][0], Path.join('/'));

    for (const entries of [abcEntries, abcEntries2, abcEntries3, abcEntries4]) {
      equal(entries.length, 2);
      equal(entries[0].path, Path.join('/', 'a', 'b', 'c', 'foo.bar'));
      equal(entries[0].content.toString(), '/a/b/c/foo.bar content');
      equal(entries[1].path, Path.join('/', 'a', 'foo.bar'));
      equal(entries[1].content.toString(), '/a/foo.bar content');
    }

    equal(filesystemReadFileSpy.mock.calls.length, 2);
    equal(filesystemReaddirSpy.mock.calls.length, 4);
  });

  it('honors the threshold', () => {
    const filesystem = Volume.fromJSON({
      '/a/b/c/foo.bar': '/a/b/c/foo.bar content',
      '/a/foo.bar': '/a/foo.bar content',
      '/foo.bar': '/foo.bar content',
    });

    const findUp = createFindUp('foo.bar');

    const entriesUpToRoot = findUp('/a/b/c', '/', filesystem);

    const entriesUpToA = findUp('/a/b/c', '/a', filesystem);
    const entriesUpToAB = findUp('/a/b/c', '/a/b', filesystem);

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

    const findUp = createFindUp('foo.{*.,}bar');

    const entriesUpToRoot = findUp('/a/b/c', '/', filesystem);

    const entriesUpToA = findUp('/a/b/c', '/a', filesystem);
    const entriesUpToAB = findUp('/a/b/c', '/a/b', filesystem);

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
