/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1848', () => {
  it('S1848', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run(
      `Objects should not be created to be dropped immediately without being used`,
      rule,
      {
        valid: [
          {
            code: `
      export default new MyConstructor();  // OK
      var something = new MyConstructor(); // OK
      something = new MyConstructor();     // OK
      callMethod(new MyConstructor());     // OK
      new MyConstructor().doSomething();   // OK
      `,
          },
          {
            code: `
      try { new MyConstructor(); } catch (e) {}
      try { if (cond()) { new MyConstructor(); } } catch (e) {}
      `,
          },
          {
            code: `
      new Notification("hello there");
      `,
          },
          {
            code: `
        import Vue from 'vue';
        new Vue();
      `,
          },
          {
            code: `
        const SomeAlias = require('vue');
        new SomeAlias();
      `,
          },
          {
            code: `
        import { Grid } from '@ag-grid-community/core';
        new Grid();
      `,
          },
          {
            code: `
        const { Grid } = require('@ag-grid-community/core');
        new Grid();
      `,
          },
          {
            code: `
import * as s3 from 'aws-cdk-lib/aws-s3';
export class Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new s3.Bucket(this, 'TempBucket', {});
  }
}`,
          },
          {
            code: `
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

new aws.s3.Bucket("my-bucket", {
  acl: "private",
  tags: {
    Environment: "Dev",
  },
});`,
          },
          {
            code: `
import { App, Chart } from 'cdk8s';
import { KubeService } from 'cdk8s-plus-25';

const app = new App();
const chart = new Chart(app, 'MyChart');

new KubeService(chart, 'MyService', {
  spec: {
    type: 'ClusterIP',
    selector: { app: 'my-app' },
    ports: [{ port: 80, targetPort: 80 }],
  },
});

app.synth();`,
          },
          {
            code: `import {AwsProvider} from "@cdktf/provider-aws/lib/provider";
new AwsProvider(this, 'aws', {
            region: 'ap-east-1', // Update the region as needed
            accessKey: '', // your accessKey
            secretKey: '' // your secretKey
        });`,
          },
          {
            // Obsidian plugins use Notice for user notifications (like browser Notification)
            code: `
import { Notice } from 'obsidian';
new Notice('Hello from Obsidian plugin!');`,
          },
          {
            // DOM attachment: document.querySelector argument
            code: `new NewBranchForm(document.querySelector('.js-create-branch-form'));`,
          },
          {
            // DOM attachment: document.getElementById argument
            code: `new SketchLoader(document.getElementById('js-sketch-viewer'));`,
          },
          {
            // DOM attachment: jQuery $() selector
            code: `new IssuableForm($('.merge-request-form'));`,
          },
          {
            // DOM attachment: property access on querySelector result
            code: `new CommitsList(document.querySelector('.js-project-commits-show').dataset.commitsLimit);`,
          },
          {
            // DOM attachment: getElementsByClassName
            code: `new ElementHandler(document.getElementsByClassName('my-class'));`,
          },
          {
            // DOM attachment: getElementsByTagName
            code: `new TagHandler(document.getElementsByTagName('div'));`,
          },
          {
            // DOM attachment: jQuery() selector
            code: `new FormHandler(jQuery('#my-form'));`,
          },
          {
            // DOM attachment: this.$() (Backbone/Marionette pattern)
            code: `new SubView(this.$('.sub-element'));`,
          },
          {
            // DOM attachment: selector nested in object argument
            code: `new ComponentInit({ el: document.querySelector('.component') });`,
          },
          {
            // DOM attachment: selector as second argument
            code: `new Widget('widget-name', document.getElementById('container'));`,
          },
          {
            // DOM attachment: variable initialized from DOM selection
            code: `const element = document.querySelector('.container');
new Widget(element);`,
          },
          {
            // DOM attachment: variable with TypeScript type assertion
            code: `const el = document.getElementById('app') as HTMLElement;
new AppController(el);`,
          },
        ],
        invalid: [
          {
            code: `new MyConstructor();
             new c.MyConstructor(123);`,
            errors: [
              {
                message: `Either remove this useless object instantiation of "MyConstructor" or use it.`,
                line: 1,
                column: 1,
                endLine: 1,
                endColumn: 18,
              },
              {
                message: `Either remove this useless object instantiation of "c.MyConstructor" or use it.`,
                line: 2,
                column: 14,
                endLine: 2,
                endColumn: 33,
              },
            ],
          },
          {
            code: `
      new function() {
        //...
        // A lot of code...
      }`,
            errors: [
              {
                message: `Either remove this useless object instantiation or use it.`,
                line: 2,
                column: 7,
                endLine: 2,
                endColumn: 10,
              },
            ],
          },
          {
            code: `
      try {} catch (e) { new MyConstructor(); }
      `,
            errors: 1,
          },
          {
            code: `
        import Vue from 'not-vue';
        import { Grid } from 'not-ag-grid';
        new Vue();
        new Grid();
      `,
            errors: 2,
          },
          {
            code: `
        import Grid from '@ag-grid-community/core';
        new Grid();
      `,
            errors: 1,
          },
        ],
      },
    );
  });
});
