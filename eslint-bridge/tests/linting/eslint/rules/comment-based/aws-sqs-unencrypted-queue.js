import { Stack } from 'aws-cdk-lib';
import { Queue, CfnQueue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { Key } from 'aws-cdk-lib/aws-kms';


class S6330NonCompliantStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue1 = new Queue(this, 'UnencryptedQueue1'); // Noncompliant {{Omitting "encryption" disables SQS queues encryption. Make sure it is safe here.}}
//                     ^^^^^
    const queue2 = new Queue(this, 'UnencryptedQueue2', {}); // Noncompliant {{Omitting "encryption" disables SQS queues encryption. Make sure it is safe here.}}
//                                                      ^^
    const queue3 = new Queue(this, 'UnencryptedQueue3', undefined); // Noncompliant {{Omitting "encryption" disables SQS queues encryption. Make sure it is safe here.}}
//                     ^^^^^
    const queue4 = new Queue(this, 'UnencryptedQueue5', {
      encryption: undefined // Noncompliant {{Omitting "encryption" disables SQS queues encryption. Make sure it is safe here.}}
//                ^^^^^^^^^
    });
    const queue5 = new Queue(this, 'UnencryptedQueue4', {
      encryption: QueueEncryption.UNENCRYPTED // Noncompliant {{Setting "encryption" to QueueEncryption.UNENCRYPTED disables SQS queues encryption. Make sure it is safe here.})
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    });

    const cfnQueue1 = new CfnQueue(this, 'UnencryptedCfnQueue1'); // Noncompliant {{Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.}}
//                        ^^^^^^^^
    const cfnQueue2 = new CfnQueue(this, 'UnencryptedCfnQueue2', {}); // Noncompliant {{Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.}}
//                                                               ^^
    const cfnQueue3 = new CfnQueue(this, 'UnencryptedCfnQueue3', undefined); // Noncompliant  {{Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.}}
//                        ^^^^^^^^
    const cfnQueue4 = new CfnQueue(this, 'UnencryptedCfnQueue4', {
      kmsMasterKeyId: undefined // Noncompliant {{Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.}}
//                    ^^^^^^^^^
    });

    const props1 = {
      kmsMasterKeyId: undefined
    };
    const cfnQueue5 = new CfnQueue(this, 'UnencryptedCfnQueue4', { ...props1 }); // Noncompliant {{Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.}}
//                                                               ^^^^^^^^^^^^^
    const props2 = undefined;
    const cfnQueue6 = new CfnQueue(this, 'UnencryptedCfnQueue4', props2); // Noncompliant {{Omitting "kmsMasterKeyId" disables SQS queues encryption. Make sure it is safe here.}}
//                                                               ^^^^^^
  }
}

class S6330CompliantStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const encryptionKey = new Key(this, 'Key', {
      enableKeyRotation: true,
    });

    const queue1 = new Queue(this, 'EncryptedQueue1', {
      encryption: QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey
    });

    const queue2 = new Queue(this, 'EncryptedQueue2', {
      encryption: QueueEncryption.KMS,
    });

    const queue3 = new Queue(this, 'EncryptedQueue3', {
      encryption: QueueEncryption.KMS_MANAGED
    });

    const args = ['UnencryptedCfnQueue4', {encryption: QueueEncryption.UNENCRYPTED}];
    const queue4 = new Queue(this, ...args);  // FN

    const queue5 = new Queue(this, 'EncryptedQueue5', unknown);
    const queue6 = new Queue(this, 'EncryptedQueue6', { ...unknown });

    const cfnQueue = new CfnQueue(this, 'EncryptedCfnQueue', {
      kmsMasterKeyId: encryptionKey.keyId
    });

    queue1.applyRemovalPolicy(RemovalPolicy.DESTROY);
    queue2.applyRemovalPolicy(RemovalPolicy.DESTROY);
    queue3.applyRemovalPolicy(RemovalPolicy.DESTROY);
    cfnQueue.applyRemovalPolicy(RemovalPolicy.DESTROY);
    encryptionKey.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
