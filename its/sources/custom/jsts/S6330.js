import { Stack, RemovalPolicy } from "aws-cdk-lib";
import { Queue, CfnQueue, QueueEncryption } from "aws-cdk-lib/aws-sqs";

class S6330NonCompliantStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const queue1 = new Queue(this, "UnencryptedQueue1"); // Sensitive
    const queue2 = new Queue(this, "UnencryptedQueue2", {}); // Sensitive
    const queue3 = new Queue(this, "UnencryptedQueue3", undefined); // Sensitive
    const queue4 = new Queue(this, "UnencryptedQueue5", {
      encryption: undefined, // Sensitive
    });
    const queue5 = new Queue(this, "UnencryptedQueue4", {
      encryption: QueueEncryption.UNENCRYPTED, // Sensitive
    });

    const cfnQueue1 = new CfnQueue(this, "UnencryptedCfnQueue1"); // Sensitive
    const cfnQueue2 = new CfnQueue(this, "UnencryptedCfnQueue2", {}); // Sensitive
    const cfnQueue3 = new CfnQueue(this, "UnencryptedCfnQueue3", undefined); // Sensitive
    const cfnQueue4 = new CfnQueue(this, "UnencryptedCfnQueue4", {
      kmsMasterKeyId: undefined, // Sensitive
    });

    queue1.applyRemovalPolicy(RemovalPolicy.DESTROY);
    cfnQueue1.applyRemovalPolicy(RemovalPolicy.DESTROY);
    queue2.applyRemovalPolicy(RemovalPolicy.DESTROY);
    cfnQueue2.applyRemovalPolicy(RemovalPolicy.DESTROY);
    queue3.applyRemovalPolicy(RemovalPolicy.DESTROY);
    cfnQueue3.applyRemovalPolicy(RemovalPolicy.DESTROY);
    queue4.applyRemovalPolicy(RemovalPolicy.DESTROY);
    cfnQueue4.applyRemovalPolicy(RemovalPolicy.DESTROY);
    queue5.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
