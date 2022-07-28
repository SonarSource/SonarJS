const cdk = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');

new s3. Bucket(this, 'id', { // Noncompliant {{Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.}}
  bucketName: 'bucket'
});
/* new cdk.aws_s3.Bucket(this, 'id', { // Noncompliant
  bucketName: 'bucket'
}); */

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  versioned: true,
});

new s3.Bucket(this, 'id', { 
  bucketName: 'bucket',
  versioned: false // Noncompliant {{Make sure using unversioned S3 bucket is safe here.}}
//           ^^^^^
});


(() => {
  const versioned = true;
  new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned: versioned,
  });
  
  new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned,
  });
})

(() => {
  const versioned = false;
  new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned: versioned, // Noncompliant
  //           ^^^^^^^^^
  });
  new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned, // Noncompliant
  //^^^^^^^^^
  });
})


 
