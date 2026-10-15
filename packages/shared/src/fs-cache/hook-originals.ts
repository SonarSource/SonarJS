/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import fs from 'node:fs';

export const originalFs = {
  access: fs.access.bind(fs),
  accessSync: fs.accessSync.bind(fs),
  close: fs.close.bind(fs),
  closeSync: fs.closeSync.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  fstat: fs.fstat.bind(fs),
  fstatSync: fs.fstatSync.bind(fs),
  lstat: fs.lstat.bind(fs),
  lstatSync: fs.lstatSync.bind(fs),
  open: fs.open.bind(fs),
  openSync: fs.openSync.bind(fs),
  opendir: fs.opendir.bind(fs),
  opendirSync: fs.opendirSync.bind(fs),
  read: fs.read.bind(fs),
  readFile: fs.readFile.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  readSync: fs.readSync.bind(fs),
  readdir: fs.readdir.bind(fs),
  readdirSync: fs.readdirSync.bind(fs),
  readlink: fs.readlink.bind(fs),
  readlinkSync: fs.readlinkSync.bind(fs),
  realpath: fs.realpath.bind(fs),
  realpathNative: fs.realpath.native.bind(fs.realpath),
  realpathSync: fs.realpathSync.bind(fs),
  realpathSyncNative: fs.realpathSync.native.bind(fs.realpathSync),
  stat: fs.stat.bind(fs),
  statSync: fs.statSync.bind(fs),
  writeSync: fs.writeSync.bind(fs),
};

export const originalPromises = {
  access: fs.promises.access.bind(fs.promises),
  lstat: fs.promises.lstat.bind(fs.promises),
  open: fs.promises.open.bind(fs.promises),
  opendir: fs.promises.opendir.bind(fs.promises),
  readFile: fs.promises.readFile.bind(fs.promises),
  readdir: fs.promises.readdir.bind(fs.promises),
  readlink: fs.promises.readlink.bind(fs.promises),
  realpath: fs.promises.realpath.bind(fs.promises),
  stat: fs.promises.stat.bind(fs.promises),
};
