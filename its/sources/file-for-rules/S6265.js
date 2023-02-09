const s3 = require('aws-cdk-lib/aws-s3');
const s3deploy = require('aws-cdk-lib/aws-s3-deployment');

const missingParams = new s3.Bucket(this, 'id', { // Compliant
  bucketName: 'bucket',
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Sensitive
});

const publicReadAccess = true; // Secondary Location
new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  publicReadAccess: publicReadAccess // Sensitive
});

const bucketNoncompliant = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant'
});
bucketNoncompliant.grantPublicAccess(); // Sensitive

new s3deploy.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.PUBLIC_READ // Sensitive
});

