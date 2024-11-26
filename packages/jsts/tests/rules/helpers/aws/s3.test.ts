/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { S3BucketTemplate } from '../../../../src/rules/index.js';

const rule = S3BucketTemplate((node, context) => {
  if (node.arguments.length > 0) {
    context.report({
      message: 'Found invalid pattern',
      node,
    });
  }
});

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
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
