const { describe, it } = require('mocha');
const { Annotations, Tags, Template } = require('aws-cdk-lib/assertions');

// A script-capable AWS CDK assertion at module level is misplaced once the
// file contains test structure.
Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {}); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

describe('AWS CDK assertions', () => {
  // Suite callbacks run while tests are collected, not as test cases.
  Template.fromJSON('{}').hasResource('AWS::S3::Bucket', {}); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  Template.fromString('{}').templateMatches({}); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  Annotations.fromStack(stack).hasError('*', 'error'); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}
  Tags.fromStack(stack).hasValues({}); // Noncompliant {{Move this assertion into a test case or a lifecycle hook.}}

  it('allows assertions in a test case', () => {
    Template.fromStack(stack).resourceCountIs('AWS::S3::Bucket', 1); // Compliant
  });

  // Query APIs are not assertions.
  Template.fromStack(stack).findResources('AWS::S3::Bucket'); // Compliant
  Template.fromJSON('{}').toJSON(); // Compliant
  Template.fromString('{}').getResourceId('Bucket'); // Compliant
});
