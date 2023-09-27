const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id1', {
  bucketName: 'bucketNoncompliant1',
  encryption: s3.BucketEncryption.UNENCRYPTED, // Noncompliant
});

const encryption = s3.BucketEncryption.UNENCRYPTED;
new s3.Bucket(this, 'id2', {
  bucketName: 'bucketNoncompliant2',
  encryption: encryption, // Noncompliant
});

new s3.Bucket(this, 'id3', {
  bucketName: 'bucketCompliant',
  encryption: s3.BucketEncryption.KMS_MANAGED, // Compliant
});
