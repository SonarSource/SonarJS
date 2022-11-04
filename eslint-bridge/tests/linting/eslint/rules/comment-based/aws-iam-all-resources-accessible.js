import * as cdk from 'aws-cdk-lib';
import {aws_iam as iam, aws_kms as kms} from 'aws-cdk-lib';

export class IAMStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const dummyPolicy = new iam.ManagedPolicy(this, "S6302DummyManagedPolicy", {
      document: new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ["s3:ListAllMyBuckets"],
          resources: ["arn:aws:s3:::*"]
        })]
      })
    })

    const policyDocument = new iam.PolicyDocument()

    // Policy document created from PolicyStatement and PolicyDocument constructors
    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowAllResources",
      effect: iam.Effect.ALLOW,
//            ^^^^^^^^^^^^^^^^> {{Related effect}}
      actions: ["iam:CreatePolicyVersion"],
      resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                ^^^
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowAllResources",
      effect: iam.Effect.ALLOW,
//            ^^^^^^^^^^^^^^^^> {{Related effect}}
      actions: ["iam:CreatePolicyVersion"],
      resources: ["arn:aws:service:::a_resource/*", "*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                                                  ^^^
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowAllResources",
      actions: ["iam:CreatePolicyVersion"],
      resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                ^^^
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowSomeResources",
      effect: iam.Effect.ALLOW,
      actions: ["iam:CreatePolicyVersion"],
      resources: [dummyPolicy.managedPolicyArn] // Compliant
    }))

    // Policy statement created from PolicyStatement.fromJson
    const policyStatementFromJson1 = iam.PolicyStatement.fromJson({
      "Sid": "AllowAllResourcesList",
      "Effect": "Allow",
//              ^^^^^^^> {{Related effect}}
      "Action": ["iam:CreatePolicyVersion"],
      "Resource": ["arn:aws:service:::a_resource/*", "*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                                                   ^^^
    })
    const policyStatementFromJson2 = iam.PolicyStatement.fromJson({
      "Sid": "AllowAllResourcesList",
      "Effect": "Allow",
//              ^^^^^^^> {{Related effect}}
      "Action": ["iam:CreatePolicyVersion"],
      "Resource": ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                 ^^^
    })
    const policyStatementFromJson3 = iam.PolicyStatement.fromJson({
      "Sid": "AllowAllResourcesList",
      "Action": ["iam:CreatePolicyVersion"],
      "Resource": ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                 ^^^
    })
    policyDocument.addStatements(policyStatementFromJson1)
    policyDocument.addStatements(policyStatementFromJson2)
    policyDocument.addStatements(policyStatementFromJson3)

    new iam.ManagedPolicy(this, "S6302ManagedPolicy", {
      document: policyDocument
    })

// Policy document created from PolicyDocument.fromJson
    const policyFocumentFromJson = iam.PolicyDocument.fromJson({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowAllResourcesList",
          "Effect": "Allow",
//                  ^^^^^^^> {{Related effect}}
          "Action": ["iam:CreatePolicyVersion"],
          "Resource": ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                     ^^^
        },
        {
          "Sid": "AllowAllResourcesStar",
          "Effect": "Allow",
//                  ^^^^^^^> {{Related effect}}
          "Action": ["iam:CreatePolicyVersion"],
          "Resource": ["arn:aws:service:::a_resource/*", "*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                                                       ^^^
        },
        {
          "Sid": "AllowAllResourcesStar",
          "Effect": "Allow",
//                  ^^^^^^^> {{Related effect}}
          "Action": ["iam:CreatePolicyVersion"],
          "Resource": "*" // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        },
        {
          "Sid": "AllowAllResourcesStar",
          "Action": ["iam:CreatePolicyVersion"],
          "Resource": "*" // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        },
        {
          "Sid": "AllowSomeResources",
          "Effect": "Allow",
          "Action": ["iam:CreatePolicyVersion"],
          "Resource": [dummyPolicy.managedPolicyArn] // Compliant
        }]
    })

    new iam.ManagedPolicy(this, "S6302ManagedPolicy-2", {
      document: policyFocumentFromJson
    })
  }
}

export class KMSStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*"
          ],
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"] // Compliant: The wildcard in this instance means "this KMS key", not "all KMS keys".
                           // See SONARIAC-260 for more details.
        })
      ]
    })

    const myCustomPolicy2 = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
            "other"
          ],
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        })
      ]
    })

    const myCustomPolicy3 = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
            other
          ],
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        })
      ]
    })

    new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
            ...other
          ],
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        })
      ]
    })

    new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: undefined,
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        })
      ]
    })

    new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: unknown,
          principals: [new iam.AccountRootPrincipal()],
          resources: ["*"] // Noncompliant {{Make sure granting access to all resources is safe here.}}
//                    ^^^
        })
      ]
    })

    iam.PolicyStatement.fromJson({
      "Sid": "AllowAllResourcesList",
      "Effect": "Allow",
      "Action": [
        "kms:Create*",
        "kms:Describe*",
        "kms:Enable*",
        "kms:List*",
        "kms:Put*",
      ],
      "Resource": ["*"] // Compliant
    })

    iam.PolicyStatement.fromJson({
      "Sid": "AllowAllResourcesList",
      "Effect": "Allow",
      "Action": "kms:Create*",
      "Resource": ["*"] // Compliant
    })

    iam.PolicyDocument.fromJson({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowAllResourcesList",
          "Effect": "Allow",
          "Action": [
            "kms:Create*",
            "kms:Describe*",
            "kms:Enable*",
            "kms:List*",
            "kms:Put*",
          ],
          "Resource": ["*"] // Compliant
        }
      ]
    });

    iam.PolicyDocument.fromJson({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowAllResourcesList",
          "Effect": "Allow",
          "Action": "kms:Create*",
          "Resource": ["*"] // Compliant
        }
      ]
    });

    new kms.Key(
      this,
      "MyKey",
      {policy: myCustomPolicy}
    )
  }
}
