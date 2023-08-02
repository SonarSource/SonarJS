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
import { S3BucketTemplate } from '@sonar/jsts/rules/helpers/aws/s3';

const rule = S3BucketTemplate((node, context) => {
  if (node.arguments.length > 0) {
    context.report({
      message: 'Found invalid pattern',
      node,
    });
  }
});

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('S3 Bucket Template', rule, {
  valid: [
    {
      code: `
const s3 = require('aws-cdk-lib/aws-s3');
new s3.Bucket();
`,
    },
    {
      code: `
const s3 = require('foo');
new s3.Bucket(42);
`,
    },
    {
      code: `
const s3 = require('aws-cdk-lib/aws-s3');
new s3.Foo(42);
`,
    },
    {
      code: `
new s3.Bucket(42);
`,
    },
    {
      code: `
new Bucket(42);
`,
    },
  ],
  invalid: [
    {
      code: `
const s3 = require('aws-cdk-lib/aws-s3');
new s3.Bucket(42);
`,
      errors: [
        {
          message: 'Found invalid pattern',
          line: 3,
        },
      ],
    },
  ],
});
