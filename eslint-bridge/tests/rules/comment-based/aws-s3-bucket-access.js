const s3 = require('aws-cdk-lib/aws-s3');

/// s3Bucket constructor

const missingParams = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
});

/// accessControl param

const invalidParam1 = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.PUBLIC_READ // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
});

const invalidParam2 = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Noncompliant {{Make sure granting PUBLIC_READ_WRITE access is safe here.}}
});
const invalidParam3 = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: s3.BucketAccessControl.AUTHENTICATED_READ // Noncompliant {{Make sure granting AUTHENTICATED_READ access is safe here.}}
});

//// secondary

const accessControl = s3.BucketAccessControl.PUBLIC_READ;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
const invalidParam1Secondary = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl, // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^
});

/// publicReadAccess param

const otherInvalidParam = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  publicReadAccess: true // Noncompliant
});

//// secondary

const publicReadAccess = true; // Secondary Location
const otherInvalidParamSecondary = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  publicReadAccess, // Noncompliant
});

// s3Bucket.grantPublicAccess()

const bucketNoncompliant = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant'
});
bucketNoncompliant.grantPublicAccess(); // Noncompliant {{Make sure allowing unrestricted access to objects from this bucket is safe here.}}
//                 ^^^^^^^^^^^^^^^^^

bucketDeployment.otherMethod();
someObject.grantPublicAccess();

// s3BucketDeployment

const bucketDeployment = new s3.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment'
});
const bucketDeploymentFromSomethingElse = new something.BucketDeployment();

/// accessControl param

const invalidBucketDeploymentParam1 = new s3.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.PUBLIC_READ // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
const invalidBucketDeploymentParam2 = new s3.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.PUBLIC_READ_WRITE // Noncompliant {{Make sure granting PUBLIC_READ_WRITE access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
const invalidBucketDeploymentParam3 = new s3.BucketDeployment(this, 'id', {
  bucketName: 'BucketDeployment',
  accessControl: s3.BucketAccessControl.AUTHENTICATED_READ // Noncompliant {{Make sure granting AUTHENTICATED_READ access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});

//// secondary

const accessControlBucketDeployment = s3.BucketAccessControl.PUBLIC_READ;
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Propagated setting.}}
const invalidBucketDeploymentParam1Secondary = new s3.Bucket(this, 'id', {
  bucketName: 'bucketnoncompliant',
  accessControl: accessControlBucketDeployment, // Noncompliant {{Make sure granting PUBLIC_READ access is safe here.}}
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
