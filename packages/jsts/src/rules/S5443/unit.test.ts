/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S5443', () => {
  it('S5443', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Using publicly writable directories is security-sensitive', rule, {
      valid: [
        {
          code: `
      const tmp = require('tmp');
      const tmp_promise = require('tmp-promise');
      
      let tmpFile = tmp.fileSync();
      tmp.file(function _tempFileCreated(err, path, fd, cleanupCallback) {});

      const tmpDir = tmp.dirSync();
      tmp.dir(function _tempDirCreated(err, path, cleanupCallback) {});


      (async () => {
        const {fd, path, cleanup} = await tmp_promise.file();
      })(); 

      tmp_promise.file().then(o => {});


      tmpFile = "/home/foo/tmp/f";
      tmpFile = "C:\\Foo\\Temp";
      tmpDir = process.other.TMP;
      tmpDir = something.env.TMP;
      tmpDir = process.env.other;
      `,
        },
      ],
      invalid: [
        {
          code: `
      tmpDir = process.env.TMPDIR;
      tmpFile = "/tmp/f";
      `,
          errors: [
            {
              message: 'Make sure publicly writable directories are used safely here.',
              line: 2,
              endLine: 2,
              column: 16,
              endColumn: 34,
            },
            {
              message: 'Make sure publicly writable directories are used safely here.',
              line: 3,
              endLine: 3,
              column: 17,
              endColumn: 25,
            },
          ],
        },
        {
          code: `
      tmpDir = process.env.TMP;
      tmpDir = process.env.TEMPDIR;
      tmpDir = process.env.TEMP;

      tmpFile = "/var/tmp/f";
      tmpFile = "/usr/tmp/f";
      tmpFile = "/dev/shm/f";
      tmpFile = "/dev/mqueue/f";
      tmpFile = "/run/lock/f";
      tmpFile = "/var/run/lock/f";
      tmpFile = "/Library/Caches/f";
      tmpFile = "/Users/Shared/f";
      tmpFile = "/private/tmp/f";
      tmpFile = "/private/var/tmp/f";
      tmpFile = "C:\\Windows\\Temp";
      tmpFile = "D:\\Windows\\Temp";
      tmpFile = "C:\\Temp";
      tmpFile = "C:\\TEMP";
      tmpFile = "C:\\TMP";
      `,
          errors: 18,
        },
      ],
    });
  });
});
