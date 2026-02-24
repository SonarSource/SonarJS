
const s3 = require('aws-cdk-lib/aws-s3');

new s3.Bucket(this, 'id', {
    bucketName: 'bucket',
    versioned: false // Sensitive
});

new s3.Bucket(this, 'id', {
  bucketName: 'bucket',
  versioned: true
});
