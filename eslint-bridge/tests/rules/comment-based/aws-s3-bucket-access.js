const s3 = require('aws-cdk-lib/aws-s3');

const missingParams = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
});

const invalidParam1 = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.PUBLIC_READ // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
});
const invalidParam2 = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Noncompliant {{Make sure granting PUBLIC_READ_WRITE access is safe here.}}
});
const invalidParam3 = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.AUTHENTICATED_READ // Noncompliant {{Make sure granting AUTHENTICATED_READ access is safe here.}}
});

const accessControl = s3.BucketAccessControl.PUBLIC_READ;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
const invalidParam1Secondary = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl, // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^
});


const otherInvalidParam = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  publicReadAccess: true // Noncompliant
});


const publicReadAccess = true; // Secondary Location
const otherInvalidParamSecondary = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  publicReadAccess, // Noncompliant
});

