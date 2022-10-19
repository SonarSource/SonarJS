import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';

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
  });

  const unencrypt = false;
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled: unencrypt // Noncompliant
  });

  const transitEncryptionEnabled = false;
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled // Noncompliant
  });

  const topicProps = { transitEncryptionEnabled: false }; // Noncompliant
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    ...topicProps
  });
}
