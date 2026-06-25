const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id1', {
  bucketName: 'bucket1',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL // Compliant
});

new s3.Bucket(this, 'id2', {
  bucketName: 'bucket2',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS // Compliant
});

new s3.Bucket(this, 'id3', {
  bucketName: 'bucket3',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY // Noncompliant
});

new s3.Bucket(this, 'id4', {
  bucketName: 'bucket4',
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls: false, // Noncompliant
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  })
});
