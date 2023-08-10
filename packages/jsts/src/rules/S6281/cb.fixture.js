const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id', { // Noncompliant {{No Public Access Block configuration prevents public ACL/policies to be set on this S3 bucket. Make sure it is safe here.}}
//  ^^^^^^^^^
  bucketName: 'bucket',
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

const blockPublicAccess = s3.BlockPublicAccess.BLOCK_ACLS;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: blockPublicAccess, // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: new s3.BlockPublicAccess() // Noncompliant {{No Public Access Block configuration prevents public ACL/policies to be set on this S3 bucket. Make sure it is safe here.}}
//                   ^^^^^^^^^^^^^^^^^^^^^^^^^^
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls         : false, // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    blockPublicPolicy       : false, // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ignorePublicAcls        : false, // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    restrictPublicBuckets   : false  // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
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
    ignorePublicAcls        : ignorePublicAcls, // Noncompliant {{Make sure allowing public ACL/policies to be set is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    restrictPublicBuckets   : true  // Compliant
  })
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL // Compliant
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
