import { Topic, CfnTopic } from 'aws-cdk-lib/aws-sns';

new Topic(this, 'UnencryptedTopic'); // Sensitive
new CfnTopic(this, 'UnencryptedCfnTopic'); // Sensitive
