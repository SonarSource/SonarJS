const s3 = require('aws-cdk-lib/aws-s3');
const s3deploy = require('aws-cdk-lib/aws-s3-deployment');

// 1. s3Bucket constructor

const missingParams = new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
});

/// 1.1 accessControl param

const invalidParam1 = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  accessControl: s3.BucketAccessControl.PUBLIC_READ // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
});

const invalidParam2 = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Noncompliant {{Make sure granting PUBLIC_READ_WRITE access is safe here.}}
});
const invalidParam3 = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  accessControl: s3.BucketAccessControl.AUTHENTICATED_READ // Noncompliant {{Make sure granting AUTHENTICATED_READ access is safe here.}}
});

//// 1.1.1 secondary

const accessControl = s3.BucketAccessControl.PUBLIC_READ;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
const invalidParam1Secondary = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  accessControl, // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^
});

/// 1.2 publicReadAccess param

const otherParamValid = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  publicReadAccess: undefined
});
const otherInvalidParam = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  publicReadAccess: true // Noncompliant
});

//// 1.2.1 secondary

const publicReadAccess = true; // Secondary Location
const otherInvalidParamSecondary = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
  publicReadAccess, // Noncompliant
});

// 2.1 s3Bucket.grantPublicAccess()

const bucketNoncompliant = new s3.Bucket(this, 'id', {
  bucketName: 'Bucket',
});
bucketNoncompliant.grantPublicAccess(); // Noncompliant {{Make sure allowing unrestricted access to objects from this bucket is safe here.}}
//                 ^^^^^^^^^^^^^^^^^

bucketDeployment.otherMethod();
someObject.grantPublicAccess();

// 3. s3BucketDeployment

const bucketDeployment = new s3deploy.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment'
});
const bucketDeploymentFromSomethingElse = new something.BucketDeployment();

/// 3.1 accessControl param

const invalidBucketDeploymentParam1 = new s3deploy.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.PUBLIC_READ // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
const invalidBucketDeploymentParam2 = new s3deploy.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Noncompliant {{Make sure granting PUBLIC_READ_WRITE access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
const invalidBucketDeploymentParam3 = new s3deploy.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.AUTHENTICATED_READ // Noncompliant {{Make sure granting AUTHENTICATED_READ access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

const falseNegative = new s3deploy.BucketDeployment(this, 'upload', {
  sources: [s3deploy.Source.asset(path.join(__dirname, '../lib'))],
  destinationBucket: bucketNoncompliant4,
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Noncompliant
});

//// 3.1.1 secondary

const accessControlBucketDeployment = s3.BucketAccessControl.PUBLIC_READ;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
const invalidBucketDeploymentParam1Secondary = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: accessControlBucketDeployment, // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
