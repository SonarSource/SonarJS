import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { Stream, CfnStream, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';

function compliant() {

  new CfnReplicationGroup(this, 'EncryptedGroup', unknownProps);

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: { ...unknownProps }
  });

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: unknownEncryption
  });

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: true
  });

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    'transitEncryptionEnabled': true
  });

  const encrypt = true;
  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: encrypt
  });

  const groupProps = { transitEncryptionEnabled: encrypt };
  new CfnReplicationGroup(this, 'EncryptedGroup', {
    ...groupProps
  });

  const groupArgs = [this, 'EncryptedGroup', { transitEncryptionEnabled: false} ];
  new CfnReplicationGroup(...groupArgs); // FN - not supporting arguments spread
}

function non_compliant() {

  new CfnReplicationGroup(this, 'UnencryptedGroup'); // Noncompliant {{Make sure that disabling transit encryption is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', undefined); // Noncompliant
//    ^^^^^^^^^^^^^^^^^^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', {}); // Noncompliant
//                                                  ^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled: false // Noncompliant
//                            ^^^^^
  });
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    'transitEncryptionEnabled': false // Noncompliant
//                              ^^^^^
  });

  const unencrypt = false;
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled: unencrypt // Noncompliant
//                            ^^^^^^^^^
  });

  const transitEncryptionEnabled = false;
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled // Noncompliant
//  ^^^^^^^^^^^^^^^^^^^^^^^^
  });

  const topicProps = { transitEncryptionEnabled: false }; // Noncompliant
//                                               ^^^^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    ...topicProps
  });
}

// AWS CDK Stream

class S5332NonCompliantKinesisStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new Stream(this, 'stream-explicit-unencrypted', {
      encryption: StreamEncryption.UNENCRYPTED // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    });

    const encryption = StreamEncryption.UNENCRYPTED;
    new Stream(this, 'stream-explicit-unencrypted', {
      encryption // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//    ^^^^^^^^^^
    });
    new Stream(this, 'stream-explicit-unencrypted', {
      ...unknown,
      encryption // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//    ^^^^^^^^^^
    });

    new CfnStream(this, 'stream-explicit-unencrypted'); // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//      ^^^^^^^^^
    new CfnStream(this, 'stream-explicit-unencrypted', undefined); // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//      ^^^^^^^^^

    new CfnStream(this, 'stream-explicit-unencrypted', {}); // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//                                                     ^^

    new CfnStream(this, 'cfnstream-explicit-unencrypted', {
      streamEncryption: undefined // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//                      ^^^^^^^^^
    });
  }
}

class S5332CompliantKinesisStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const encryptionKey = new Key(this, 'Key', {
      enableKeyRotation: true,
    });

    new Stream(this, 'stream-implicit-encrypted'); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', undefined); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', foo()); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', unknown); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', {}); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', {
      encryption: undefined  // Compliant, encryption is the default
    });

    new Stream(this, 'stream-explicit-encrypted-selfmanaged', {
      encryption: StreamEncryption.KMS, // Compliant
      encryptionKey: encryptionKey,
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      encryption: StreamEncryption.MANAGED // Compliant
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      ...unknown,
      encryption: StreamEncryption.MANAGED // Compliant
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      encryption: unknown // Compliant
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      ...unknown,
      encryption: unknown // Compliant
    });

    const encryption = StreamEncryption.MANAGED;
    new Stream(this, 'stream-explicit-encrypted-managed', {
      encryption // Compliant
    });

    new CfnStream(this, 'cfnstream-explicit-encrypted', { // Compliant
      streamEncryption: {
        encryptionType: 'encryptionType',
        keyId: encryptionKey.keyId,
      }
    });
  }
}

