import { CfnReplicationGroup } from "aws-cdk-lib/aws-elasticache";
import { Stream, CfnStream, StreamEncryption } from "aws-cdk-lib/aws-kinesis";

new CfnReplicationGroup(this, "unencrypted", {
  replicationGroupDescription: "description",
  transitEncryptionEnabled: false, // Sensitive: Make sure that disabling transit encryption is safe here.
});

new Stream(this, "stream-explicit-unencrypted", {
  encryption: StreamEncryption.UNENCRYPTED, // Sensitive: Make sure that disabling stream encryption is safe here.
});

new CfnStream(this, "stream-explicit-unencrypted"); // Sensitive: Make sure that disabling stream encryption is safe here.
