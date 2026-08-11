// Linted by assertion-frameworks.test.ts. Imports two frameworks so a profile selecting one must
// not see the other. Lives next to a package.json declaring no test dependencies, so dependency
// based gating cannot leak in from the repository manifest.
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';

assert.equal(actual, expected);
Template.fromStack(stack).hasResourceProperties('AWS::S3::Bucket', {});
