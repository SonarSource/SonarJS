import * as cdk from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";

export class IAMStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const policyDocument = new iam.PolicyDocument();

    // Policy document created from PolicyStatement and PolicyDocument constructors
    policyDocument.addStatements(
      new iam.PolicyStatement({
        sid: "AllowActions",
        effect: iam.Effect.ALLOW,
        actions: ["*"], // Noncompliant
        resources: ["arn:aws:iam:::user/*"],
      })
    );

    policyDocument.addStatements(
      new iam.PolicyStatement({
        sid: "DenyActions",
        effect: iam.Effect.DENY,
        actions: ["*"], // Compliant
        resources: ["arn:aws:iam:::user/*"],
      })
    );

    policyDocument.addStatements(
      new iam.PolicyStatement({
        sid: "AllowSomeActions",
        effect: iam.Effect.ALLOW,
        actions: ["iam:GetAccountSummary"],
        resources: ["arn:aws:iam:::user/*"], // Compliant
      })
    );

    // Policy statement created from PolicyStatement.fromJson
    const policyStatementFromJson = iam.PolicyStatement.fromJson({
      Sid: "AllowActionsList",
      Effect: "Allow",
      Action: ["*"], // Noncompliant
      Resource: "arn:aws:iam:::user/*",
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
          Sid: "AllowActionsList",
          Effect: "Allow",
          Action: ["*"], // Noncompliant
          Resource: "arn:aws:iam:::user/*",
        },
        {
          Sid: "AllowActionsStar",
          Effect: "Allow",
          Action: "*", // Noncompliant
          Resource: "arn:aws:iam:::user/*",
        },
        {
          Sid: "AllowSomeActions",
          Effect: "Allow",
          Action: ["iam:GetAccountSummary"], // Compliant
          Resource: "arn:aws:iam:::user/*",
        },
        {
          Sid: "AllowSomeActionsEnum",
          Effect: iam.Effect.ALLOW,
          Action: ["iam:GetAccountSummary"], // Compliant
          Resource: "arn:aws:iam:::user/*",
        },
      ],
    });

    new iam.ManagedPolicy(this, "S6302ManagedPolicy-2", {
      document: policyFocumentFromJson,
    });
  }
}
