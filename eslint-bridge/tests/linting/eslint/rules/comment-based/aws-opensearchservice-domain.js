import * as cdk from 'aws-cdk-lib';
import { aws_opensearchservice as opensearchservice } from 'aws-cdk-lib';

class NonCompliantS6308Stack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    /*
     * Default: Implicitly non compliant
     */
    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
    });

    new opensearchservice.CfnDomain(this, 'ImplicitlyNonCompliantCfnDomain', { // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      engineVersion: 'OpenSearch_1.3',
    });

    new opensearchservice.Domain(this, 'IncompleteNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: { }, // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
    });

    new opensearchservice.CfnDomain(this, 'IncompleteNonCompliantCfnDomain', {
      engineVersion: 'OpenSearch_1.3',
      encryptionAtRestOptions: { }, // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
    });

    /*
     * Explicitly non compliant
     */
    new opensearchservice.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted OpenSearch domains is safe here.}}
      },
    });

    new opensearchservice.CfnDomain(this, 'ExplicitlyNonCompliantCfnDomain', {
      engineVersion: 'OpenSearch_1.3',
      encryptionAtRestOptions: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted OpenSearch domains is safe here.}}
      },
    });
  }
}

class CompliantS6308Stack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    new opensearchservice.Domain(this, 'CompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: true,
      },
    });

    new opensearchservice.CfnDomain(this, 'CompliantCfnDomain', {
      engineVersion: 'OpenSearch_1.3',
      encryptionAtRestOptions: {
        enabled: true,
      },
    });
  }
}

const app = new cdk.App();
new NonCompliantS6308Stack(app, 'NonCompliantS6308Stack');
new CompliantS6308Stack(app, 'CompliantS6308Stack');
app.synth();
