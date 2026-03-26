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
//    ^^^^^
  new Topic(this, 'UnencryptedTopic', undefined); // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
//    ^^^^^
  new Topic(this, 'UnencryptedTopic', {}); // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
//                                    ^^
  new Topic(this, 'UnencryptedTopic', {
    masterKey: undefined // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
//             ^^^^^^^^^
  });
  new Topic(this, 'UnencryptedTopic', {
    'masterKey': undefined // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
  });
  new Topic(this, 'UnencryptedTopic', {
    masterKey: undefinedKey // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
  });

  const masterKey = undefined;
  new Topic(this, 'UnencryptedTopic', {
    masterKey // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
  });

  const topicProps = { masterKey: undefinedKey };
  new Topic(this, 'UnencryptedTopic', { // Noncompliant {{Omitting "masterKey" disables SNS topics encryption. Make sure it is safe here.}}
    ...topicProps
  });

  const undefinedKeyId = undefined;

  new CfnTopic(this, 'UnencryptedCfnTopic'); // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
//    ^^^^^^^^
  new CfnTopic(this, 'UnencryptedCfnTopic', undefined); // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
//    ^^^^^^^^
  new CfnTopic(this, 'UnencryptedCfnTopic', {}); // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
//                                          ^^
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId: undefined // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
//                  ^^^^^^^^^
  });
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    'kmsMasterKeyId': undefined // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
  });
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId: undefinedKeyId // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
  });

  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId: undefinedKeyId // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
  });

  const kmsMasterKeyId = undefined;
  new CfnTopic(this, 'UnencryptedCfnTopic', {
    kmsMasterKeyId // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
  });

  const cfnTopicProps = { kmsMasterKeyId: undefinedKeyId };
  new CfnTopic(this, 'UnencryptedCfnTopic', { // Noncompliant {{Omitting "kmsMasterKeyId" disables SNS topics encryption. Make sure it is safe here.}}
    ...cfnTopicProps
  });
}
