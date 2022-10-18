import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';

new CfnReplicationGroup(this, 'unencrypted', {
  replicationGroupDescription: 'description',
  transitEncryptionEnabled: false // Sensitive: Make sure that disabling transit encryption is safe here.
});
