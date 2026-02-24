const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id1', {
  bucketName: 'bucket1',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL // Compliant
});

new s3.Bucket(this, 'id2', {
  bucketName: 'bucket2',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS // Noncompliant
});
