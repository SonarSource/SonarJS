import * as cdk from 'aws-cdk-lib';
import { aws_iam as iam, aws_kms as kms, aws_s3 as s3 } from 'aws-cdk-lib';

export class IAMStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "S6270Bucket");

    // Policy document created from PolicyStatement and PolicyDocument constructors
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        "sid": "AllowAnyPrincipal",
        "effect": iam.Effect.ALLOW,
//                ^^^^^^^^^^^^^^^^> {{Related effect}}
        "actions": ["s3:*"],
        "resources": [bucket.arnForObjects("*")],
        "principals": [new iam.StarPrincipal()] // Noncompliant {{Make sure granting public access is safe here.}}
//                     ^^^^^^^^^^^^^^^^^^^^^^^
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        "sid": "AllowAnyPrincipal",
        "actions": ["s3:*"],
        "resources": [bucket.arnForObjects("*")],
        "principals": [new iam.StarPrincipal()] // Noncompliant {{Make sure granting public access is safe here.}}
//                     ^^^^^^^^^^^^^^^^^^^^^^^
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowStarPrincipal",
        effect: iam.Effect.ALLOW,
//              ^^^^^^^^^^^^^^^^> {{Related effect}}
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.StarPrincipal()], // Noncompliant {{Make sure granting public access is safe here.}}
//                   ^^^^^^^^^^^^^^^^^^^^^^^
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowArnPrincipalStar",
        effect: iam.Effect.ALLOW,
//              ^^^^^^^^^^^^^^^^> {{Related effect}}
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.ArnPrincipal("*")], // Noncompliant {{Make sure granting public access is safe here.}}
//                   ^^^^^^^^^^^^^^^^^^^^^^^^^
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "DenyAnyPrincipal",
        effect: iam.Effect.DENY,
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.AnyPrincipal()], // Compliant
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowAccountRootPrincipal",
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.AccountRootPrincipal()], // Compliant
      })
    );

    bucket.addToResourcePolicy( // Compliant
      new iam.PolicyStatement({
        sid: "AllowAccountRootPrincipal",
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
      })
    );

    // Policy statement created from PolicyStatement.fromJson
    const policyStatementFromJson1 = iam.PolicyStatement.fromJson({
      Sid: "AllowAnyPrincipal2",
      Effect: "Allow",
//            ^^^^^^^> {{Related effect}}
      Action: ["s3:*"],
      Resource: bucket.arnForObjects("*"),
      Principal: {AWS: "*"}, // Noncompliant {{Make sure granting public access is safe here.}}
//                     ^^^
    });
    bucket.addToResourcePolicy(policyStatementFromJson1);

    const policyStatementFromJson2 = iam.PolicyStatement.fromJson({
      Sid: "AllowAnyPrincipal2",
      Action: ["s3:*"],
      Resource: bucket.arnForObjects("*"),
      Principal: {AWS: "*"}, // Noncompliant {{Make sure granting public access is safe here.}}
//                     ^^^
    });
    bucket.addToResourcePolicy(policyStatementFromJson2);

    // Policy document created from PolicyDocument.fromJson
    const policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AnyPrincipal",
          Effect: "Allow",
//                ^^^^^^^> {{Related effect}}
          Action: ["kms:*"],
          Resource: "*",
          Principal: {
            AWS: [
              "*", // Noncompliant {{Make sure granting public access is safe here.}}
//            ^^^
            ],
          },
        },
        {
          Sid: "StarPrincipal",
          Effect: "Allow",
//                ^^^^^^^> {{Related effect}}
          Action: ["kms:*"],
          Resource: "*",
          Principal: "*", // Noncompliant {{Make sure granting public access is safe here.}}
//                   ^^^
        },
        {
          Sid: "AccountRootPrincipal",
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: "*",
          Principal: {AWS: new iam.AccountRootPrincipal().arn}, // Compliant
        },
        {
          Sid: "AccountRootPrincipal", // Compliant
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: "*",
        },
        {
          Sid: "AccountRootPrincipal",
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: "*",
          Principal: {}, // Compliant
        },
      ],
    };

    const policyDocumentFromJson = iam.PolicyDocument.fromJson(policyDocument);
    new kms.Key(this, "S6270Key", {policy: policyDocumentFromJson});
  }
}


const destinationKmsKey = new kms.Key(
  this,
  `s3-cross-account-replication-dest-key`,
  {
    alias: Config.destinationKmsKeyAlias,
    description:
      "Key used for KMS Encryption for the destination s3 bucket for cross account replication",
    policy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: "Enable IAM User Permissions",
          effect: iam.Effect.ALLOW,
          principals: [
            new iam.ArnPrincipal(
              `arn:aws:iam::${Config.destinationAccountId}:root`
            ),
          ],
          actions: ["kms:*"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          sid: "Enable Replication Permissions",
          effect: iam.Effect.ALLOW,
          principals: [new iam.ArnPrincipal(replicationRoleArn.valueAsString)],
          actions: [
            "kms:Encrypt",
            "kms:Decrypt",
            "kms:ReEncrypt*",
            "kms:GenerateDataKey*",
            "kms:DescribeKey",
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          sid: "Enable Replication Permissions",
          effect: iam.Effect.ALLOW,
          principals: [new iam.ArnPrincipal(replicationRoleArn.valueAsString)],
          actions: [
            "kms:Encrypt",
            "kms:Decrypt",
            "kms:ReEncrypt*",
            "kms:GenerateDataKey*",
            "kms:DescribeKey",
          ],
          resources: ["*"],
        }),
      ],
    }),
    enableKeyRotation: true,
  }
);

