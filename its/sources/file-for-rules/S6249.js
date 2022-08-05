const s3 = require('aws-cdk-lib/aws-s3');

const enforceSSLFalse = new s3.Bucket(this, 'enforce.ssl.false', {
  bucketName: 'enforce.ssl.false',
  versioned: true,
  publicReadAccess: false,
  enforceSSL: false // Noncompliant: Make sure authorizing HTTP requests is safe here.
});

const enforceSSLTrue = new s3.Bucket(this, 'enforce.ssl.true', {
  bucketName: 'enforce.ssl.true',
  versioned: true,
  publicReadAccess: false,
  enforceSSL: true // Compliant
});
