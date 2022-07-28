const cdk = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');

// Sensitive: Omitting "versioned" disables S3 bucket versioning. Make sure it is safe here
new s3.Bucket(this, 'id', { // Noncompliant
  bucketName: 'bucket'
});
/* new cdk.aws_s3.Bucket(this, 'id', { // Noncompliant
  bucketName: 'bucket'
}); */


// Sensitive: Make sure using unversioned S3 bucket is safe here
new s3.Bucket(this, 'id', { 
  bucketName: 'bucket',
  versioned: false // Noncompliant
//           ^^^^^
});

/* // Sensitive: Make sure using unversioned S3 bucket is safe here
const versioned = false;

new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned: versioned, // Noncompliant
//             ^^^^^^^^^
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  versioned, // Noncompliant
//^^^^^^^^^
}); */
