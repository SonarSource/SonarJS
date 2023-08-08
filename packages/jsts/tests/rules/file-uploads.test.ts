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
import { RuleTester } from 'eslint';
import { rule } from '../../src/rules/file-uploads';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

function encodedMessage(
  message: string,
  secondary?: { line: number; column: number; endColumn: number; endLine: number },
) {
  let secondaryLocations = [];
  if (secondary) {
    secondaryLocations = [
      {
        message: 'no destination specified',
        column: secondary.column,
        line: secondary.line,
        endColumn: secondary.endColumn,
        endLine: secondary.endLine,
      },
    ];
  }
  return JSON.stringify({
    message,
    secondaryLocations,
  });
}

ruleTester.run('File uploads should be restricted', rule, {
  valid: [
    {
      code: `
      const formidable = require('formidable');
      const form = formidable(options);
        `,
    },
    {
      code: `
      const multer = require('multer');
      const upload = multer();
        `,
    },
  ],
  invalid: [
    {
      code: `
      const formidableModule = require('formidable');
      const { formidable } = require('formidable');
      const { formidable: formidableAlias } = require('formidable');
      const { IncomingForm, Formidable } = require('formidable');

      const form1 = formidableModule({ keepExtensions: true }); // Noncompliant
      const form2 = formidable({ keepExtensions: true }); // Noncompliant
      const form3 = formidableAlias({ keepExtensions: true }); // Noncompliant
      const form4 = new IncomingForm({ keepExtensions: true }); // Noncompliant
      const form5 = new Formidable({ keepExtensions: true }); // Noncompliant
      const form6 = new Formidable.Foo({ keepExtensions: true }); // OK

        `,
      errors: 5,
    },
    {
      code: `
      import * as formidableModule from 'formidable';
      import { formidable } from 'formidable';
      import { IncomingForm } from 'formidable';
      import { Formidable } from 'formidable';

      const form1 = formidableModule({ keepExtensions: true }); // Noncompliant
      const form2 = formidable({ keepExtensions: true }); // Noncompliant
      const form4 = new IncomingForm({ keepExtensions: true }); // Noncompliant
      const form5 = new Formidable({ keepExtensions: true }); // Noncompliant
        `,
      errors: 4,
    },
    {
      code: `
      import { formidable } from 'formidable';
      const form0 = formidable({ keepExtensions: false, uploadDir: './uploads/' }); // OK
      const form1 = formidable({ uploadDir: './uploads/' }); // OK
      const form2 = formidable({ keepExtensions: true, uploadDir: './uploads/' }); // Noncompliant
      const form3 = formidable({ keepExtensions: true }); // Noncompliant
      const form4 = formidable({ keepExtensions: false }); // Noncompliant
      const form5 = formidable({ }); // Noncompliant
      const form6 = formidable({ keepExtensions: 42, uploadDir: './uploads/' }); // OK
      const form7 = formidable({ keepExtensions: 0, uploadDir: './uploads/' });  // OK
        `,
      errors: [
        { message: encodedMessage('Restrict the extension of uploaded files.'), line: 5 },
        {
          message: encodedMessage(
            'Restrict the extension and folder destination of uploaded files.',
          ),
          line: 6,
        },
        { message: encodedMessage('Restrict folder destination of uploaded files.'), line: 7 },
        { message: encodedMessage('Restrict folder destination of uploaded files.'), line: 8 },
      ],
    },
    {
      code: `
      import { formidable } from 'formidable';

      const optionsOk = { keepExtensions: false, uploadDir: './uploads/' };
      const form0 = formidable(optionsOk); // Ok

      let optionsUnset;
      const form1 = formidable(optionsUnset); // Ok

      const optionsNokConst = { keepExtensions: true, uploadDir: './uploads/' };
      const form2 = formidable(optionsNokConst); // Noncompliant

      let optionsNokLet = { keepExtensions: true, uploadDir: './uploads/' };
      const form3 = formidable(optionsNokLet); // Noncompliant

      const optionsNotObject = 42;      
      const form4 = formidable(optionsNotObject); // OK
        `,
      errors: [
        { message: encodedMessage('Restrict the extension of uploaded files.'), line: 11 },
        { message: encodedMessage('Restrict the extension of uploaded files.'), line: 14 },
      ],
    },
    {
      code: `
      import { formidable } from 'formidable';
      const form0 = formidable(); // Noncompliant

      const form1 = formidable(); // Noncompliant
      form1.keepExtensions = true;
      form1.uploadDir = './uploads/';

      const form2 = formidable(); // OK
      form2.keepExtensions = false;
      form2.uploadDir = './uploads/';

      const form3 = formidable();  // OK
      form3.uploadDir = './uploads/';

      let form4;
      form4 = formidable(); // Noncompliant
      form4.keepExtensions = true;

      form5 = formidable(); // OK, undeclared variable
      form5.keepExtensions = true;

      foo(formidable()); // OK
        `,
      errors: [
        { message: encodedMessage('Restrict folder destination of uploaded files.'), line: 3 },
        { message: encodedMessage('Restrict the extension of uploaded files.'), line: 5 },
        {
          message: encodedMessage(
            'Restrict the extension and folder destination of uploaded files.',
          ),
          line: 17,
        },
      ],
    },
    {
      code: `
      import { formidable } from 'formidable';

      function foo() {
        const form = formidable(); // Noncompliant
      }

      function bar() {
        const form = formidable(); // OK
        form.keepExtensions = false;
        form.uploadDir = './uploads/';
      }
        `,
      errors: [
        {
          message: encodedMessage('Restrict folder destination of uploaded files.'),
          line: 5,
          column: 22,
          endLine: 5,
          endColumn: 32,
        },
      ],
    },
    {
      code: `
      const multer = require('multer');

      multer({});
      multer({ dest: 'uploads/' });
      multer({ fileFilter: myFileFilter });
      multer({ dest: 'uploads/', fileFilter: myFileFilter });

      const myStorageOk = multer.diskStorage({ destination: 'uploads/', filename: filenameFunc });
      multer({ storage: myStorageOk });
      const myStorageNok = multer.diskStorage({ filename: filenameFunc });
      multer({ storage: myStorageNok }); // Noncompliant
      multer({ storage: unknownStorage });
        `,
      errors: [{ line: 12, endLine: 12, column: 7, endColumn: 13 }],
    },
    {
      code: `
      import * as multer from 'multer';
      const storage = multer.diskStorage({ filename: filenameFunc });
      multer({ storage }); // Noncompliant
      multer({ storage: multer.diskStorage({ filename: filenameFunc }) }); // Noncompliant
      const options = { storage };
      multer(options); // Noncompliant
      const storageOptions = { filename: filenameFunc };
      multer({ storage: multer.diskStorage(storageOptions) }); // Noncompliant
      multer({ storage: foo.bar(storageOptions) });
      multer({ storage: multer.diskStorage() }); 
      `,
      errors: [
        {
          message: encodedMessage('Restrict folder destination of uploaded files.', {
            line: 3,
            endLine: 3,
            column: 22,
            endColumn: 40,
          }),
          line: 4,
        },
        {
          message: encodedMessage('Restrict folder destination of uploaded files.', {
            line: 5,
            endLine: 5,
            column: 24,
            endColumn: 42,
          }),
          line: 5,
        },
        {
          message: encodedMessage('Restrict folder destination of uploaded files.', {
            line: 3,
            endLine: 3,
            column: 22,
            endColumn: 40,
          }),
          line: 7,
        },
        {
          message: encodedMessage('Restrict folder destination of uploaded files.', {
            line: 9,
            endLine: 9,
            column: 24,
            endColumn: 42,
          }),
          line: 9,
        },
      ],
    },
  ],
});
