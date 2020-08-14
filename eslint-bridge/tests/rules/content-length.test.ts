/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
import { rule } from 'rules/content-length';
const options = [8_000_000, 2_000_000];

ruleTester.run('Allowing requests with excessive content length is security-sensitive', rule, {
  valid: [
    {
      code: `
      const formidable = require('formidable');
      const form = formidable(options);
        `,
      options,
    },
    {
      code: `
      const multer = require('multer');
      const upload = multer();
        `,
      options,
    },
  ],
  invalid: [
    {
      code: `
      const formidableModule = require('formidable');
      const { formidable } = require('formidable');
      const { formidable: formidableAlias } = require('formidable');
      const { IncomingForm, Formidable } = require('formidable');

      const form1 = formidableModule(); // Noncompliant
      const form2 = formidable(); // Noncompliant
      const form3 = formidableAlias(); // Noncompliant
      const form4 = new IncomingForm(); // Noncompliant
      const form5 = new Formidable(); // Noncompliant
      const form6 = new Formidable.Foo(); // OK
        `,
      errors: 5,
      options,
    },
    {
      code: `
      import * as formidableModule from 'formidable';
      import { formidable } from 'formidable';
      import { IncomingForm } from 'formidable';
      import { Formidable } from 'formidable';

      const form1 = formidableModule(); // Noncompliant
      const form2 = formidable(); // Noncompliant
      const form4 = new IncomingForm(); // Noncompliant
      const form5 = new Formidable(); // Noncompliant
        `,
      errors: 4,
      options,
    },
    {
      code: `
      import { formidable } from 'formidable';
      const form0 = formidable();
      form0.maxFileSize = 42; // OK
      
      const form1 = formidable();
      form1.maxFileSize = 42000000; // Noncompliant
      
      const form2 = formidable();
      const size = 42000000;
      form2.maxFileSize = size; // Noncompliant
        `,
      errors: [
        {
          message: 'Make sure the content length limit is safe here.',
          line: 7,
          endLine: 7,
          column: 7,
          endColumn: 35,
        },
        {
          message: 'Make sure the content length limit is safe here.',
          line: 11,
        },
      ],
      options,
    },
    {
      code: `
      import { formidable } from 'formidable';
      const form0 = formidable({ maxFileSize: 42000000 }); // Noncompliant
      const options = { maxFileSize: 42000000 }; // Noncompliant
      const form1 = formidable(options);
      const form2 = formidable({}); // Noncompliant, default is used
      const size = 42000000;
      const form3 = formidable({ maxFileSize: size }); // Noncompliant

      const formOk0 = formidable({ maxFileSize: 42 });
      const formOk1 = formidable({ maxFileSize: unknown });
      const formOk2 = formidable({ maxFileSize: foo() });
      const notLiteral = foo();
      const formOk3 = formidable({ maxFileSize: notLiteral });
        `,
      errors: [
        {
          message: 'Make sure the content length limit is safe here.',
          line: 3,
          endLine: 3,
          column: 34,
          endColumn: 55,
        },
        {
          message: 'Make sure the content length limit is safe here.',
          line: 4,
        },
        {
          message: 'Make sure the content length limit is safe here.',
          line: 6,
        },
        {
          message: 'Make sure the content length limit is safe here.',
          line: 8,
        },
      ],
      options,
    },
  ],
});
