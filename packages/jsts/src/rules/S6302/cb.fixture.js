import * as cdk from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';

export class IAMStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const policyDocument = new iam.PolicyDocument()

    const action = unknown;
    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowActions",
      effect: iam.Effect.ALLOW,
      actions: [action], // Compliant
      resources: ["arn:aws:iam:::user/*"]
    }))

    policyDocument.addStatements(new iam.PolicyStatement({ // Compliant
      sid: "AllowActions",
      effect: iam.Effect.ALLOW,
      resources: ["arn:aws:iam:::user/*"]
    }))

    // Policy document created from PolicyStatement and PolicyDocument constructors
    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowActions",
      effect: iam.Effect.ALLOW,
//            ^^^^^^^^^^^^^^^^> {{Related effect}}
      actions: ["*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//              ^^^
      resources: ["arn:aws:iam:::user/*"]
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowActions",
      actions: ["*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//              ^^^
      resources: ["arn:aws:iam:::user/*"]
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowActions",
      effect: iam.Effect.ALLOW,
//            ^^^^^^^^^^^^^^^^> {{Related effect}}
      actions: ["service:permission","*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//                                   ^^^
      resources: ["arn:aws:iam:::user/*"]
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "DenyActions",
      effect: iam.Effect.DENY,
      actions: ["*"], // Compliant
      resources: ["arn:aws:iam:::user/*"]
    }))

    policyDocument.addStatements(new iam.PolicyStatement({
      sid: "AllowSomeActions",
      effect: iam.Effect.ALLOW,
      actions: ["iam:GetAccountSummary"],
      resources: ["arn:aws:iam:::user/*"] // Compliant
    }))

    // Policy statement created from PolicyStatement.fromJson
    const policyStatementFromJson1 = iam.PolicyStatement.fromJson({
      "Sid": "AllowActionsList",
      "Effect": "Allow",
//              ^^^^^^^> {{Related effect}}
      "Action": ["*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//               ^^^
      "Resource": "arn:aws:iam:::user/*"
    })
    policyDocument.addStatements(policyStatementFromJson1)

    const policyStatementFromJson2 = iam.PolicyStatement.fromJson({
      "Sid": "AllowActionsList",
      "Action": ["*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//               ^^^
      "Resource": "arn:aws:iam:::user/*"
    })
    policyDocument.addStatements(policyStatementFromJson2)

    new iam.ManagedPolicy(this, "S6302ManagedPolicy", {
      document: policyDocument
    })

// Policy document created from PolicyDocument.fromJson
    const policyFocumentFromJson = iam.PolicyDocument.fromJson({
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowActionsList",
          "Effect": "Allow",
//                  ^^^^^^^> {{Related effect}}
          "Action": ["*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//                   ^^^
          "Resource": "arn:aws:iam:::user/*"
        }, {
          "Sid": "AllowActionsList",
          "Effect": "Allow",
//                  ^^^^^^^> {{Related effect}}
          "Action": ["service:permission","*"], // Noncompliant {{Make sure granting all privileges is safe here.}}
//                                        ^^^
          "Resource": "arn:aws:iam:::user/*"
        }, {
          "Sid": "AllowActionsStar",
          "Effect": "Allow",
//                  ^^^^^^^> {{Related effect}}
          "Action": "*", // Noncompliant {{Make sure granting all privileges is safe here.}}
//                  ^^^
          "Resource": "arn:aws:iam:::user/*"
        }, {
          "Sid": "AllowActionsStar",
          "Action": "*", // Noncompliant {{Make sure granting all privileges is safe here.}}
//                  ^^^
          "Resource": "arn:aws:iam:::user/*"
        },
        {
          "Sid": "AllowSomeActions",
          "Effect": "Allow",
          "Action": ["iam:GetAccountSummary"], // Compliant
          "Resource": "arn:aws:iam:::user/*"
        },
        {
          "Sid": "AllowSomeActionsEnum",
          "Effect": iam.Effect.ALLOW,
          "Action": ["iam:GetAccountSummary"], // Compliant
          "Resource": "arn:aws:iam:::user/*"
        }]
    })

    new iam.ManagedPolicy(this, "S6302ManagedPolicy-2", {
      document: policyFocumentFromJson
    })
  }
}
