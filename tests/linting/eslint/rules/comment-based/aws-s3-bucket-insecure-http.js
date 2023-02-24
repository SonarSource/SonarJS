const s3 = require('aws-cdk-lib/aws-s3');

// Default
const enforceSSLDefault = new s3.Bucket(this, 'enforce.ssl.default', { // Noncompliant {{Omitting 'enforceSSL' authorizes HTTP requests. Make sure it is safe here.}}
                           // ^^^^^^^^^
  bucketName: 'enforce.ssl.default',
  versioned: true,
  publicReadAccess: false,
});

const enforceSSLFalse = new s3.Bucket(this, 'enforce.ssl.false', {
  bucketName: 'enforce.ssl.false',
  versioned: true,
  publicReadAccess: false,
  enforceSSL: false // Noncompliant {{Make sure authorizing HTTP requests is safe here.}}
//^^^^^^^^^^^^^^^^^
});

const enforceSSLTrue = new s3.Bucket(this, 'enforce.ssl.true', {
  bucketName: 'enforce.ssl.true',
  versioned: true,
  publicReadAccess: false,
  enforceSSL: true // Compliant
});

const enforceSSLUnknown = new s3.Bucket(this, 'enforce.ssl.true', {
  bucketName: 'enforce.ssl.true',
  versioned: true,
  publicReadAccess: false,
  enforceSSL: unknown() // Compliant
});

const missingConfiguration = new s3.Bucket(this, 'enforce.ssl.true'); // Noncompliant
                              // ^^^^^^^^^
