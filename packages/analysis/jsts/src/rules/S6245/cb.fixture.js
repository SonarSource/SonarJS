const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id1', { // Noncompliant {{Omitting "encryption" disables server-side encryption. Make sure it is safe here.}}
//  ^^^^^^^^^
  bucketName: 'bucketNoncompliant1',
});

new s3.Bucket(this, 'id2', {
  bucketName: 'bucketNoncompliant2',
  encryption: s3.BucketEncryption.UNENCRYPTED, // Noncompliant {{Objects in the bucket are not encrypted. Make sure it is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

const encryption = s3.BucketEncryption.UNENCRYPTED;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
new s3.Bucket(this, 'id3', {
  bucketName: 'bucketNoncompliant3',
  encryption: encryption, // Noncompliant {{Objects in the bucket are not encrypted. Make sure it is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^
});

new s3.Bucket(this, 'id4', {
  bucketName: 'bucketCompliant1',
  encryption: s3.BucketEncryption.KMS_MANAGED // Compliant
});

new s3.Bucket(this, 'id5', {
  bucketName: 'bucketCompliant2',
  encryption: this.BucketEncryption.UNENCRYPTED, // Compliant
});

const s3Fake = require('some-fake-aws-cdk-lib/aws-s3');
new s3.Bucket(this, 'id6', {
  bucketName: 'bucketCompliant3',
  encryption: s3Fake.BucketEncryption.UNENCRYPTED, // Compliant
});
