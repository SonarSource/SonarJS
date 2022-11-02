const cdk = require('aws-cdk-lib');
const s3 = require('aws-cdk-lib/aws-s3');

const noOptions = new s3.Bucket(this, 'id'); // Noncompliant {{Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.}}
//                    ^^^^^^^^^

const noOptionsParam = new s3.Bucket(this, 'id', { // Noncompliant {{Omitting the "versioned" argument disables S3 bucket versioning. Make sure it is safe here.}}
//                         ^^^^^^^^^
  bucketName: 'bucket'
});

const versioned = new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  versioned: true,
});
const notVersioned = new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  versioned: false // Noncompliant {{Make sure using unversioned S3 bucket is safe here.}}
//^^^^^^^^^^^^^^^^
});


(() => {
  const versioned = true;
  const isVersioned = new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned: versioned,
  });

  const isVersionedShorthand = new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned,
  });
})

(() => {
  const versioned = false;
//      ^^^^^^^^^^^^^^^^^> {{Propagated setting}}
  const isNotVersioned = new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned: versioned, // Noncompliant {{Make sure using unversioned S3 bucket is safe here.}}
  //^^^^^^^^^^^^^^^^^^^^
  });
  const isNotVersionedShorthand = new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned, // Noncompliant
  //^^^^^^^^^
  });
})

const undefinedParam = new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  versioned: undefined,
});

const wrongTypeOptions = new s3.Bucket(this, 'id', 'notAnObject');  // Noncompliant
//                           ^^^^^^^^^

const params = {
  bucketName: 'bucket',
  versioned: false, // Noncompliant {{Make sure using unversioned S3 bucket is safe here.}}
//^^^^^^^^^^^^^^^^
};
const optionsInExternalObject = new s3.Bucket(this, 'id', params);
