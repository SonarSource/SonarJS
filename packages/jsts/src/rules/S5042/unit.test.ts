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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './/index.js';

const ruleTesterTs = new TypeScriptRuleTester();

/*
 +-+-+-+
 |T|A|R|
 +-+-+-+                   
 */
ruleTesterTs.run(
  'Expanding archive files without controlling resource consumption is security sensitive [tar library]',
  rule,
  {
    valid: [
      {
        code: `
        const tar = require('tar');

        tar.x({
          file: 'foo.tar.gz',
          filter: somePredicate
        });
        tar.x(someVar);
        tar.x();
        tar.x({file: 'foo.tar.gz', ...other});
        tar.x({file: 'foo.tar.gz', 'filter': somePredicate});`,
      },
    ],
    invalid: [
      {
        code: `
        const tar = require('tar');

        tar.x({ // Sensitive
          file: 'foo.tar.gz'
        });`,
        errors: [
          {
            message: 'Make sure that expanding this archive file is safe here.',
            line: 4,
            column: 9,
            endLine: 4,
            endColumn: 14,
          },
        ],
      },
      {
        code: `
        import tar from 'tar';

        tar.x({ // Sensitive
          file: 'foo.tar.gz'
        });`,
        errors: 1,
      },
      {
        code: `
        import {x} from 'tar';

        x({ // FN
          file: 'foo.tar.gz'
        });`,
        errors: 1,
      },
    ],
  },
);

/*

 +-+-+-+-+-+-+-+
 |A|D|M|-|Z|I|P|
 +-+-+-+-+-+-+-+
 */
ruleTesterTs.run(
  'Expanding archive files without controlling resource consumption is security sensitive [adm-zip library]',
  rule,
  {
    valid: [
      {
        code: `
      const AdmZip = require('adm-zip');

      let zip = new AdmZip("./foo.zip");
      zip.getEntries();`,
      },
      {
        code: `
        const AdmZip = require('other-lib');

        let zip = new AdmZip("./foo.zip");
        zip.extractAllTo(".");`,
      },
    ],
    invalid: [
      {
        code: `
        const AdmZip = require('adm-zip');

        let zip = new AdmZip("./foo.zip");
        zip.extractAllTo("."); // Sensitive`,
        errors: [
          {
            message: 'Make sure that expanding this archive file is safe here.',
            line: 5,
            column: 9,
            endLine: 5,
            endColumn: 25,
          },
        ],
      },
      {
        code: `
        importAdmZip from 'adm-zip';

        let zip = new AdmZip("./foo.zip");
        zip.extractAllTo("."); // Sensitive`,
        errors: 1,
      },
    ],
  },
);

/**
 +-+-+-+-+-+
 |J|S|Z|I|P|
 +-+-+-+-+-+
*/
ruleTesterTs.run(
  'Expanding archive files without controlling resource consumption is security sensitive [jszip library]',
  rule,
  {
    valid: [
      {
        code: `
        const JSZip = require("jszip");
        JSZip.other();`,
      },
    ],
    invalid: [
      {
        code: `
        const JSZip = require("jszip");
        JSZip.loadAsync(data);`,
        errors: [
          {
            message: 'Make sure that expanding this archive file is safe here.',
            line: 3,
            column: 9,
            endLine: 3,
            endColumn: 24,
          },
        ],
      },
    ],
  },
);

/**
 +-+-+-+-+-+
 |Y|A|U|Z|L|
 +-+-+-+-+-+
*/
ruleTesterTs.run(
  'Expanding archive files without controlling resource consumption is security sensitive [yauzl library]',
  rule,
  {
    valid: [
      {
        code: `
        const yauzl = require("yauzl");
        yauzl.other();`,
      },
    ],
    invalid: [
      {
        code: `
        const yauzl = require("yauzl");
        yauzl.open('foo.zip', cb);`,
        errors: [
          {
            message: 'Make sure that expanding this archive file is safe here.',
            line: 3,
            column: 9,
            endLine: 3,
            endColumn: 19,
          },
        ],
      },
    ],
  },
);
/**
 +-+-+-+-+-+-+-+-+-+-+-+
 |E|X|T|R|A|C|T|-|Z|I|P|
 +-+-+-+-+-+-+-+-+-+-+-+
*/
ruleTesterTs.run(
  'Expanding archive files without controlling resource consumption is security sensitive [extract-zip library]',
  rule,
  {
    valid: [
      {
        code: `
        const extract = require('extract-zip');
        extract('foo.zip', {onEntry: cb});
        extract();
        extract('foo.zip');`,
      },
      {
        code: `
        const extract = require('other');
        extract('foo.zip', {});`,
      },
    ],
    invalid: [
      {
        code: `
        const extract = require('extract-zip');
        extract('foo.zip', {});`,
        errors: [
          {
            message: 'Make sure that expanding this archive file is safe here.',
            line: 3,
            column: 9,
            endLine: 3,
            endColumn: 16,
          },
        ],
      },
    ],
  },
);
