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
import { AwsCdkTemplate } from '../../../../src/rules/helpers/index.js';
import { NoTypeCheckingRuleTester } from '../../../tools/testers/rule-tester.js';
import { describe } from 'node:test';

const rule = AwsCdkTemplate({
  'aws-cdk-lib.aws_module.Class': (node, context) => {
    context.report({ node, message: 'Found it!' });
  },
});
describe('aws test', () => {
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('AWS CDK Rule Template', rule, {
    valid: [
      {
        code: `new Class()`,
      },
      {
        code: `new cdk.Class()`,
      },
      {
        code: `new cdk.aws_module.Class()`,
      },
      {
        code: `
const { Class } = require('aws-cdk-lib/aws-module');
function b() {
  const Class = {};
  new Class();
}`,
      },
      {
        code: `
import { Class } from 'aws-cdk-lib/aws-module';
function b() {
  const Class = {};
  new Class();
}`,
      },
      {
        code: `
import { default as cdk } from 'aws-cdk-lib';
new cdk.aws_module.Class(...args);
      `,
      },
    ],
    invalid: [
      {
        code: `
const { Class } = require('aws-cdk-lib/aws-module');
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
const { Class: foo } = require('aws-cdk-lib/aws-module');
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const { Class: foo } = require('aws-cdk-lib/aws-module');
const bar = foo;
new bar();
      `,
        errors: 1,
      },
      {
        code: `
const { Class } = require('aws-cdk-lib').aws_module;
new Class();
      `,
        errors: 1,
      },
      {
        code: `
const foo = require('aws-cdk-lib').aws_module?.Class;
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const foo = require('aws-cdk-lib').aws_module!.Class;
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const foo = require('aws-cdk-lib').aws_module.Class;
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const foo = require('aws-cdk-lib')['aws_module']['Class'];
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const { Class: foo } = require('aws-cdk-lib').aws_module;
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const { aws_module: cdk } = require('aws-cdk-lib');
new cdk.Class();
      `,
        errors: 1,
      },
      {
        code: `
const { aws_module: cdk } = require('aws-cdk-lib');
const foo = cdk?.Class;
new foo();
      `,
        errors: 1,
      },
      {
        code: `
const { aws_module } = require('aws-cdk-lib');
new aws_module.Class();
      `,
        errors: 1,
      },
      {
        code: `
const cdk = require('aws-cdk-lib');
new cdk.aws_module.Class();
      `,
        errors: 1,
      },
      {
        code: `
import { Class } from 'aws-cdk-lib/aws-module';
new Class();
      `,
        errors: 1,
      },
      {
        code: `
import { Class as foo } from 'aws-cdk-lib/aws-module';
new foo();
      `,
        errors: 1,
      },
      {
        code: `
import { aws_module } from 'aws-cdk-lib';
new aws_module.Class();
      `,
        errors: 1,
      },
      {
        code: `
import { aws_module as foo } from 'aws-cdk-lib';
new foo.Class();
      `,
        errors: 1,
      },
      {
        code: `
import cdk from 'aws-cdk-lib';
new cdk.aws_module.Class();
      `,
        errors: 1,
      },
      {
        code: `
import cdk from 'aws-cdk-lib';
new cdk.aws_module!.Class();
      `,
        errors: 1,
      },
      {
        code: `
import cdk = require('aws-cdk-lib');
new cdk.aws_module.Class();
      `,
        errors: 1,
      },
      {
        code: `
import cdk = require('aws-cdk-lib');
import module = cdk.aws_module;
new module.Class();
      `,
        errors: 1,
      },
      {
        code: `
import { default as cdk } from 'aws-cdk-lib';
new cdk.aws_module.Class();
      `,
        errors: 1,
      },
    ],
  });
});
