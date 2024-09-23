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
import { rule } from './/index.js';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

let tests = {
  valid: [
    {
      code: `
    const fs = require('fs');

    // Octal
    fs.chmodSync("/tmp/fs", 0o0770);  // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", 0o770);   // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", 0o70);    // Compliant ----rwx---
    fs.chmodSync("/tmp/fs", 0o0);     // Compliant ----------

    fs.chmodSync("/tmp/fs", "0770");  // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", "770");   // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", "70");    // Compliant ----rwx---
    fs.chmodSync("/tmp/fs", "0");     // Compliant ----------
    fs.chmodSync("/tmp/fs", "00770"); // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", "00");    // Compliant ----------

    // fs.constants
    fs.chmodSync("/tmp/fs", fs.constants.S_IRUSR); // Compliant -r--------
    fs.chmodSync("/tmp/fs", fs.constants.S_IWUSR); // Compliant --w-------
    fs.chmodSync("/tmp/fs", fs.constants.S_IXUSR); // Compliant ---x------
    fs.chmodSync("/tmp/fs", fs.constants.S_IRWXU); // Compliant -rwx------
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP); // Compliant ----r-----
    fs.chmodSync("/tmp/fs", fs.constants.S_IWGRP); // Compliant -----w----
    fs.chmodSync("/tmp/fs", fs.constants.S_IXGRP); // Compliant ------x---
    fs.chmodSync("/tmp/fs", fs.constants.S_IRWXG); // Compliant ----rwx---
    fs.chmodSync("/tmp/fs", fs.constants.S_IRWXU | fs.constants.S_IRWXG); // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP | fs.constants.S_IRUSR); // Compliant -r--r-----

    // Decimal
    // Should raise when the mode as decimal value modulo 8 does not equal zero ($mode%8 !== 0)
    fs.chmodSync("/tmp/fs", 32);     // Compliant; 4 % 8 = 4    ----r-----
    fs.chmodSync("/tmp/fs", 256);   // Compliant; 260 % 8 = 4   -r--------

    // Variable
    let doChmod = (mode) => fs.chmodSync("/tmp/fs", mode); // Compliant; mode value is unknown
  `,
    },
    {
      code: `
    process = require('process');

    // Octal
    process.umask(0o777); // Compliant
    process.umask(0o007); // Compliant
    process.umask(0o07); // Compliant
    process.umask(0o7); // Compliant

    // String
    process.umask("0777"); // Compliant
    process.umask("0007"); // Compliant
    process.umask("007"); // Compliant
    process.umask("07"); // Compliant
    process.umask("7"); // Compliant

    // Decimal
    // Should raise when the mask as decimal value modulo 8 does not equal seven ($mode%8 !== 7)
    process.umask(7);   // Compliant 0o007
    process.umask(511); // Compliant 0o777

    // Variable
    let updateUmask = (mode) => process.umask(mode); // Compliant; mode value is unknown
    `,
    },
    {
      code: `
    // fs.constants
    fs.chmodSync("/tmp/fs", fs.constants.S_IRUSR); // Compliant -r--------
    fs.chmodSync("/tmp/fs", fs.constants.S_IWUSR); // Compliant --w-------
    fs.chmodSync("/tmp/fs", fs.constants.S_IXUSR); // Compliant ---x------
    fs.chmodSync("/tmp/fs", fs.constants.S_IRWXU); // Compliant -rwx------
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP); // Compliant ----r-----
    fs.chmodSync("/tmp/fs", fs.constants.S_IWGRP); // Compliant -----w----
    fs.chmodSync("/tmp/fs", fs.constants.S_IXGRP); // Compliant ------x---
    fs.chmodSync("/tmp/fs", fs.constants.S_IRWXG); // Compliant ----rwx---
    fs.chmodSync("/tmp/fs", fs.constants.S_IRWXU | fs.constants.S_IRWXG); // Compliant -rwxrwx---
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP | fs.constants.S_IRUSR); // Compliant -r--r-----
    
    //coverage
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP | 0o700); // Compliant -r--r-----
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP | foo()); // Compliant -r--r-----    
    fs.chmodSync("/tmp/fs", fs.constants.S_IRGRP & fs.constants.S_IRUSR);
    fs.chmodSync("/tmp/fs", foo());
    fs.chmodSync("/tmp/fs", fs.bla);
    fs.chmodSync("/tmp/fs", /rwx/);
    `,
    },
    {
      code: `
      const x = y;
      const y = x;
      fs.chmodSync("/tmp/fs", x);
    `,
    },
  ],
  invalid: [
    {
      code: `
      const fs = require('fs');
      // Octal
      fs.chmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx`,
      errors: [
        {
          message: 'Make sure this permission is safe.',
          line: 4,
          column: 31,
          endLine: 4,
          endColumn: 37,
        },
      ],
    },
    {
      code: `
      const fs = require('node:fs');
      // Octal
      fs.chmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx`,
      errors: 1,
    },
    {
      code: `
      const fs = require('fs');

      fs.chmod("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fs.chmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fs.fchmod("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fs.fchmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fs.lchmod("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fs.lchmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx`,
      errors: 6,
    },
    {
      code: `
      const fsPromises = require('fs').promises;

      fsPromises.chmod("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fsPromises.chmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fsPromises.fchmod("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fsPromises.fchmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fsPromises.lchmod("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fsPromises.lchmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx`,
      errors: 6,
    },
    {
      code: `
      const fs = require('fs');

      // Octal
      fs.chmodSync("/tmp/fs", 0o0777);  // Sensitive -rwxrwxrwx
      fs.chmodSync("/tmp/fs", 0o0551);  // Sensitive -r-xr-x--x
      fs.chmodSync("/tmp/fs", 0o0007);  // Sensitive -------rwx
      fs.chmodSync("/tmp/fs", 0o007);   // Sensitive -------rwx
      fs.chmodSync("/tmp/fs", 0o07);    // Sensitive -------rwx
      fs.chmodSync("/tmp/fs", 0o7);     // Sensitive -------rwx
  `,
      errors: 6,
    },
    {
      code: `
    const fs = require('fs');

    // String
    fs.chmodSync("/tmp/fs", "777");   // Sensitive -rwxrwxrwx
    fs.chmodSync("/tmp/fs", "551");   // Sensitive -r-xr-x--x
    fs.chmodSync("/tmp/fs", "007");   // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "07");    // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "7");     // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "00777"); // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "00007"); // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "0007");  // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "007");   // Sensitive -------rwx
    fs.chmodSync("/tmp/fs", "07");    // Sensitive -------rwx
    `,
      errors: 10,
    },
    {
      code: `
    const fs = require('fs');

    // Decimal
    // Should raise when the mode as decimal value modulo 8 does not equal zero ($mode%8 !== 0)
    fs.chmodSync("/tmp/fs", 4);     // Sensitive; 4 % 8 = 4     -------r--
    fs.chmodSync("/tmp/fs", 260);   // Sensitive; 260 % 8 = 4   -r-----r--
  `,
      errors: 2,
    },
    {
      code: `
         // FileHandler
        async function fileHandler() {
          let filehandle;
          try {
            filehandle = fsPromises.open('/tmp/fsPromises', 'r'); // filehandle type is FileHandle (see https://nodejs.org/api/fs.html#fs_class_filehandle)
            // Sensitive function depending on the "mode" parameter
            filehandle.chmod(0o777); // Sensitive
          } finally {
            if (filehandle !== undefined)
              filehandle.close();
          }
        }
     `,
      errors: [
        {
          message: 'Make sure this permission is safe.',
          line: 8,
          column: 30,
          endLine: 8,
          endColumn: 35,
        },
      ],
    },
    {
      code: `
    var process = require('process');

    // Octal
    process.umask(0o000); // Sensitive
    `,
      errors: [
        {
          message: 'Make sure this permission is safe.',
          line: 5,
          column: 19,
          endLine: 5,
          endColumn: 24,
        },
      ],
    },
    {
      code: `
    var process = require('process');

    // Octal
    process.umask(0o000); // Sensitive
    process.umask(0o022); // Sensitive
    process.umask(0o22); // Sensitive
    process.umask(0o2); // Sensitive

    // String
    process.umask("0000"); // Sensitive
    process.umask("0022"); // Sensitive
    process.umask("022"); // Sensitive
    process.umask("02"); // Sensitive
    process.umask("0"); // Sensitive
    process.umask("2"); // Sensitive

    // Decimal
    process.umask(0);   // Sensitive 0o000
    process.umask(18);  // Sensitive 0o022
    `,
      errors: 12,
    },
    {
      code: `
      // fs.constants
      fs.chmodSync("/tmp/fs", fs.constants.S_IROTH); // Sensitive -------r--
      fs.chmodSync("/tmp/fs", fs.constants.S_IWOTH); // Sensitive --------w-
      fs.chmodSync("/tmp/fs", fs.constants.S_IXOTH); // Sensitive ---------x
      fs.chmodSync("/tmp/fs", fs.constants.S_IRWXO); // Sensitive -------rwx
      fs.chmodSync("/tmp/fs", fs.constants.S_IRWXU | fs.constants.S_IRWXG | fs.constants.S_IRWXO); // Sensitive -rwxrwxrwx
      fs.chmodSync("/tmp/fs", fs.constants.S_IROTH | fs.constants.S_IRGRP | fs.constants.S_IRUSR); // Sensitive -r--r--r--
      `,
      errors: 6,
    },
    {
      code: `
      const mode = fs.constants.S_IROTH;
      fs.chmodSync("/tmp/fs", mode); // Sensitive -------r--
      fs.chmodSync("/tmp/fs", fs.constants.S_IRWXU | mode); // Sensitive -------r--
      `,
      errors: 2,
    },
  ],
};

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Using publicly writable directories is security-sensitive', rule, tests);

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('Using publicly writable directories is security-sensitive [TS]', rule, tests);
