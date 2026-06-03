const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id', { // Compliant: omitting blockPublicAccess defaults to all blocked
  bucketName: 'bucket',
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS_ONLY // Noncompliant {{Using BLOCK_ACLS_ONLY allows public access via bucket policies.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

const blockPublicAccess = s3.BlockPublicAccess.BLOCK_ACLS_ONLY;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: blockPublicAccess, // Noncompliant {{Using BLOCK_ACLS_ONLY allows public access via bucket policies.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: new s3.BlockPublicAccess() // Compliant: omitting args defaults to all blocked
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls         : false, // Noncompliant {{Disabling public access block settings allows public ACL/policies to be set on this S3 bucket.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    blockPublicPolicy       : false, // Noncompliant {{Disabling public access block settings allows public ACL/policies to be set on this S3 bucket.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ignorePublicAcls        : false, // Noncompliant {{Disabling public access block settings allows public ACL/policies to be set on this S3 bucket.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    restrictPublicBuckets   : false  // Noncompliant {{Disabling public access block settings allows public ACL/policies to be set on this S3 bucket.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  })
});

const ignorePublicAcls = false;
//    ^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls         : true, // Compliant
    blockPublicPolicy       : true, // Compliant
    ignorePublicAcls        : ignorePublicAcls, // Noncompliant {{Disabling public access block settings allows public ACL/policies to be set on this S3 bucket.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    restrictPublicBuckets   : true  // Compliant
  })
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL // Compliant
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS // Compliant: now sets all four attributes to true
});

const restrictPublicBuckets = true;
new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls         : true, // Compliant
    blockPublicPolicy       : true, // Compliant
    ignorePublicAcls        : true, // Compliant
    restrictPublicBuckets   : restrictPublicBuckets // Compliant
  })
});
