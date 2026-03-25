import cdk from 'aws-cdk-lib';
import { aws_elasticsearch as elasticsearch, aws_opensearchservice as opensearchservice } from 'aws-cdk-lib';
import { EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { ElasticsearchVersion } from 'aws-cdk-lib/aws-elasticsearch';

class NonCompliantS6308Stack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    /*
     * Default: Implicitly non compliant
     */
    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain'); // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    new opensearchservice.CfnDomain(this, 'ImplicitlyNonCompliantCfnDomain'); // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    new elasticsearch.Domain(this, 'ImplicitlyNoncompliantDomain'); // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    new elasticsearch.CfnDomain(this, 'ImplicitlyNonCompliantCfnDomain'); // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', undefined); // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//                                                                     ^^^^^^^^^

    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
    });
    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      version: EngineVersion.OPENSEARCH_1_3,
    });
    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
      version: EngineVersion.ELASTICSEARCH_7_10,
    });
    new opensearchservice.CfnDomain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      engineVersion: 'OpenSearch_1.3',
    });
    new opensearchservice.CfnDomain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
      engineVersion: 'Elasticsearch_7.10',
    });
    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
    });
    new elasticsearch.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
      version: elasticsearch.ElasticsearchVersion.V7_4,
    });
    new elasticsearch.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
      version: ElasticsearchVersion.V7_4,
    });
    new elasticsearch.CfnDomain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
      elasticsearchVersion: '7.4',
    });

    new opensearchservice.Domain(this, 'ImplicitlyNoncompliantDomain', { // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      version: unknown
    });

    new opensearchservice.CfnDomain(this, 'ImplicitlyNonCompliantCfnDomain', { // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
      engineVersion: 'OpenSearch_1.3',
    });

    new opensearchservice.CfnDomain(this, 'ImplicitlyNonCompliantCfnDomain', { // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
      engineVersion: 'Elasticsearch_7.10',
    });

    new opensearchservice.Domain(this, 'IncompleteNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: { }, // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//                      ^^^
    });

    new opensearchservice.CfnDomain(this, 'IncompleteNonCompliantCfnDomain', {
      engineVersion: 'OpenSearch_1.3',
      encryptionAtRestOptions: { }, // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//                             ^^^
    });

    new elasticsearch.Domain(this, 'IncompleteNoncompliantDomain', {
      version: elasticsearch.ElasticsearchVersion.V7_9,
      encryptionAtRest: { }, // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
//                      ^^^
    });

    new elasticsearch.CfnDomain(this, 'IncompleteNonCompliantCfnDomain', {
      elasticsearchVersion: '1.3',
      encryptionAtRestOptions: { }, // Noncompliant {{Omitting encryptionAtRestOptions causes encryption of data at rest to be disabled for this Elasticsearch domain. Make sure it is safe here.}}
//                             ^^^
    });
    new opensearchservice.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: undefined, // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//               ^^^^^^^^^
      },
    });

    new opensearchservice.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        ...unknown,
        enabled: undefined, // Noncompliant {{Omitting encryptionAtRest causes encryption of data at rest to be disabled for this OpenSearch domain. Make sure it is safe here.}}
//               ^^^^^^^^^
      },
    });

    /*
     * Explicitly non compliant
     */
    new opensearchservice.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted OpenSearch domains is safe here.}}
//               ^^^^^
      },
    });

    new opensearchservice.CfnDomain(this, 'ExplicitlyNonCompliantCfnDomain', {
      engineVersion: 'OpenSearch_1.3',
      encryptionAtRestOptions: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted OpenSearch domains is safe here.}}
//               ^^^^^
      },
    });

    new elasticsearch.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: elasticsearch.ElasticsearchVersion.V7_9,
      encryptionAtRest: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted Elasticsearch domains is safe here.}}
//               ^^^^^
      },
    });

    new elasticsearch.CfnDomain(this, 'ExplicitlyNonCompliantCfnDomain', {
      elasticsearchVersion: '1.3',
      encryptionAtRestOptions: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted Elasticsearch domains is safe here.}}
//               ^^^^^
      },
    });

    const enabled = false; // Noncompliant {{Make sure that using unencrypted Elasticsearch domains is safe here.}}
//                  ^^^^^
    const elasticsearchVersion = '1.3';
    new elasticsearch.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: elasticsearch.ElasticsearchVersion.V7_9,
      encryptionAtRest: {
        enabled,
      },
    });

    const enabled1 = false; // Noncompliant {{Make sure that using unencrypted Elasticsearch domains is safe here.}}
//                   ^^^^^
    new elasticsearch.CfnDomain(this, 'ExplicitlyNonCompliantCfnDomain', {
      elasticsearchVersion,
      encryptionAtRestOptions: {
        enabled: enabled1,
      },
    });

    const enabled2 = false; // Noncompliant {{Make sure that using unencrypted Elasticsearch domains is safe here.}}
//                   ^^^^^
    new elasticsearch.CfnDomain(this, 'ExplicitlyNonCompliantCfnDomain', {
      elasticsearchVersion,
      encryptionAtRestOptions: {
        ...unknown,
        enabled: enabled2,
      },
    });

    const args = {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: false, // Noncompliant {{Make sure that using unencrypted OpenSearch domains is safe here.}}
//               ^^^^^
      },
    };
    new opensearchservice.Domain(this, 'CompliantDomain', {
      ...args
    });
  }
}

class CompliantS6308Stack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    new opensearchservice.Domain(this, 'CompliantDomain', unknown);

    const args1 = ['CompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: false,
      },
    }];
    new opensearchservice.Domain(this, ...args1); // FN

    new opensearchservice.Domain(this, 'CompliantDomain', { ...unknown }); // Compliant

    new opensearchservice.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: unknown
      },
    });

    new opensearchservice.Domain(this, 'ExplicitlyNoncompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: foo()
      },
    });

    new opensearchservice.Domain(this, 'CompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: true,
      },
    });

    new opensearchservice.Domain(this, 'CompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: "true", // FN
      },
    });

    const enabled = true;
    new opensearchservice.Domain(this, 'CompliantDomain', {
      version: opensearchservice.EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled,
      },
    });

    new opensearchservice.Domain(this, 'CompliantDomain', {
      version: EngineVersion.OPENSEARCH_1_3,
      encryptionAtRest: {
        enabled: true,
      },
    });

    new opensearchservice.CfnDomain(this, 'CompliantCfnDomain', {
      engineVersion: 'ElasticSearch_1.3',
      encryptionAtRestOptions: {
        enabled: true,
      },
    });

    new elasticsearch.Domain(this, 'CompliantDomain', {
      version: elasticsearch.ElasticsearchVersion.V7_9,
      encryptionAtRest: {
        enabled: true,
      },
    });

    new elasticsearch.CfnDomain(this, 'CompliantCfnDomain', {
      elasticsearchVersion: '1.3',
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
