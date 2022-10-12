/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { AwsCdkTemplate } from 'linting/eslint/rules/helpers/aws';

const rule = AwsCdkTemplate({
  'aws-cdk-lib.module.Class': (node, context) => {
    context.report({ node, message: 'Found it!' });
  },
});

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('AWS CDK Rule Template', rule, {
  valid: [
    {
      code: `new Class()`,
    },
    {
      code: `new cdk.Class()`,
    },
    {
      code: `new cdk.module.Class()`,
    },
  ],
  invalid: [
    {
      code: `
const { Class } = require('aws-cdk-lib/module');
new Class();
      `,
      errors: [
        {
          message: 'Found it!',
          line: 3,
        },
      ],
    },
    {
      code: `
const { Class: foo } = require('aws-cdk-lib/module');
new foo();
      `,
      errors: 1,
    },
    {
      code: `
const { Class } = require('aws-cdk-lib').module;
new Class();
      `,
      errors: 1,
    },
    {
      code: `
const { Class: foo } = require('aws-cdk-lib').module;
new foo();
      `,
      errors: 1,
    },
    {
      code: `
const { module: cdk } = require('aws-cdk-lib');
new cdk.Class();
      `,
      errors: 1,
    },
    {
      code: `
const { module } = require('aws-cdk-lib');
new module.Class();
      `,
      errors: 1,
    },
    {
      code: `
const cdk = require('aws-cdk-lib');
new cdk.module.Class();
      `,
      errors: 1,
    },
    {
      code: `
import { Class } from 'aws-cdk-lib/module';
new Class();
      `,
      errors: 1,
    },
    {
      code: `
import { Class as foo } from 'aws-cdk-lib/module';
new foo();
      `,
      errors: 1,
    },
    {
      code: `
import { module } from 'aws-cdk-lib';
new module.Class();
      `,
      errors: 1,
    },
    {
      code: `
import { module as foo } from 'aws-cdk-lib';
new foo.Class();
      `,
      errors: 1,
    },
    {
      code: `
import cdk from 'aws-cdk-lib';
new cdk.module.Class();
      `,
      errors: 1,
    },
    {
      code: `
import * as cdk from 'aws-cdk-lib';
new cdk.module.Class();
      `,
      errors: 1,
    },
    {
      code: `
import { default as cdk } from 'aws-cdk-lib';
new cdk.module.Class();
      `,
      errors: 1,
    },
  ],
});
