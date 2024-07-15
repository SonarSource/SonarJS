import { CfnTopic, Topic } from 'aws-cdk-lib/aws-sns';
import { Key } from 'aws-cdk-lib/aws-kms';

function compliant() {

  new Topic(this, 'EncryptedTopic', {
    masterKey: unknownKey
  });

  const encryptionKey = new Key(this, 'Key', { enableKeyRotation: true });

  new Topic(this, 'EncryptedTopic', {
    masterKey: encryptionKey
  });

  new Topic(this, 'EncryptedTopic', {
    'masterKey': encryptionKey
  });

  const topicProps = { masterKey: encryptionKey };

  new Topic(this, 'EncryptedTopic', {
    ...topicProps
  });

  const topicArgs = [this, 'EncryptedTopic', { masterKey: undefined} ];
  new Topic(...topicArgs); // FN - not supporting arguments spread

  new CfnTopic(this, 'EncryptedCfnTopic', {
    kmsMasterKeyId: unknownKeyId
  });

  new CfnTopic(this, 'EncryptedCfnTopic', {
    ...unknownOptions
  });

  new CfnTopic(this, 'EncryptedCfnTopic', unknownOptionsnb);

  new CfnTopic(this, 'EncryptedCfnTopic', {
    kmsMasterKeyId: encryptionKey.keyId
  });

  new CfnTopic(this, 'EncryptedCfnTopic', {
    'kmsMasterKeyId': encryptionKey.keyId
  });

  const cfnTopicProps = { kmsMasterKeyId: encryptionKey.keyId };

  new CfnTopic(this, 'EncryptedCfnTopic', {
    ...cfnTopicProps
  });

  const cfnTopicArgs = [this, 'EncryptedCfnTopic', { kmsMasterKeyId: undefined} ];
  new CfnTopic(...cfnTopicArgs); // FN - not supporting arguments spread
}

function non_compliant() {

  const undefinedKey = undefined;

  new Topic(this, 'UnencryptedTopic'); // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
  new Topic(this, 'UnencryptedTopic', undefined); // Noncompliant
  new Topic(this, 'UnencryptedTopic', {}); // Noncompliant
  new Topic(this, 'UnencryptedTopic', {
    masterKey: undefined // Noncompliant
  });
  new Topic(this, 'UnencryptedTopic', {
    'masterKey': undefined // Noncompliant
  });
  new Topic(this, 'UnencryptedTopic', {
    masterKey: undefinedKey // Noncompliant
  });

  const masterKey = undefined;
  new Topic(this, 'UnencryptedTopic', {
    masterKey // Noncompliant
  });

  const topicProps = { masterKey: undefinedKey };
  new Topic(this, 'UnencryptedTopic', { // Noncompliant
    ...topicProps
  });

  const undefinedKeyId = undefined;

  new CfnTopic(this, 'UnencryptedCfnTopic'); // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
  new CfnTopic(this, 'UnencryptedCfnTopic', undefined); // Noncompliant
  new CfnTopic(this, 'UnencryptedCfnTopic', {}); // Noncompliant
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId: undefined // Noncompliant
  });
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    'kmsMasterKeyId': undefined // Noncompliant
  });
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId: undefinedKeyId // Noncompliant
  });

  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId: undefinedKeyId // Noncompliant
  });

  const kmsMasterKeyId = undefined;
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId // Noncompliant
  });

  const cfnTopicProps = { kmsMasterKeyId: undefinedKeyId };
  new CfnTopic(this, 'UnencryptedCfnTopic', { // Noncompliant
    ...cfnTopicProps
  });
}
