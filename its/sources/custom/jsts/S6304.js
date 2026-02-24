import * as cdk from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";

export class IAMStack extends cdk.Stack {
  constructor(scope, id, propss) {
    super(scope, id, props);

    const dummyPolicy = new iam.ManagedPolicy(this, "S6302DummyManagedPolicy", {
      document: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ["s3:ListAllMyBuckets"],
            resources: ["arn:aws:s3:::*"],
          }),
        ],
      }),
    });

    const policyDocument = new iam.PolicyDocument();

    // Policy document created from PolicyStatement and PolicyDocument constructors
    policyDocument.addStatements(
      new iam.PolicyStatement({
        sid: "AllowAllResources",
        effect: iam.Effect.ALLOW,
        actions: ["iam:CreatePolicyVersion"],
        resources: ["*"], // Noncompliant
      })
    );

    policyDocument.addStatements(
      new iam.PolicyStatement({
        sid: "AllowSomeResources",
        effect: iam.Effect.ALLOW,
        actions: ["iam:CreatePolicyVersion"],
        resources: [dummyPolicy.managedPolicyArn], // Compliant
      })
    );

    // Policy statement created from PolicyStatement.fromJson
    const policyStatementFromJson = iam.PolicyStatement.fromJson({
      Sid: "AllowAllResourcesList",
      Effect: "Allow",
      Action: ["iam:CreatePolicyVersion"],
      Resource: ["*"], // Noncompliant
    });
    policyDocument.addStatements(policyStatementFromJson);

    new iam.ManagedPolicy(this, "S6302ManagedPolicy", {
      document: policyDocument,
    });

    // Policy document created from PolicyDocument.fromJson
    const policyFocumentFromJson = iam.PolicyDocument.fromJson({
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AllowAllResourcesList",
          Effect: "Allow",
          Action: ["iam:CreatePolicyVersion"],
          Resource: ["*"], // Noncompliant
        },
        {
          Sid: "AllowAllResourcesStar",
          Effect: "Allow",
          Action: ["iam:CreatePolicyVersion"],
          Resource: "*", // Noncompliant
        },
        {
          Sid: "AllowSomeResources",
          Effect: "Allow",
          Action: ["iam:CreatePolicyVersion"],
          Resource: [dummyPolicy.managedPolicyArn], // Compliant
        },
      ],
    });

    new iam.ManagedPolicy(this, "S6302ManagedPolicy-2", {
      document: policyFocumentFromJson,
    });
  }
}

export class KMSStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const myCustomPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
          ],
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"], // Compliant: The wildcard in this instance means "this KMS key", not "all KMS keys".
          // See SONARIAC-260 for more details.
        }),
      ],
    });

    new kms.Key(this, "MyKey", {
      policy: myCustomPolicy,
    });
  }
}
