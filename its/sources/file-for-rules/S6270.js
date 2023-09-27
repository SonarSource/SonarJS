import * as cdk from "aws-cdk-lib";
import { aws_iam as iam, aws_kms as kms, aws_s3 as s3 } from "aws-cdk-lib";

export class IAMStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "S6270Bucket");

    // Policy document created from PolicyStatement and PolicyDocument constructors
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowAnyPrincipal",
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.AnyPrincipal()], // Noncompliant
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowStarPrincipal",
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.StarPrincipal()], // Noncompliant
      })
    );

    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowArnPrincipalStar",
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [bucket.arnForObjects("*")],
        principals: [new iam.ArnPrincipal("*")], // Noncompliant
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

    // Policy statement created from PolicyStatement.fromJson
    const policyStatementFromJson = iam.PolicyStatement.fromJson({
      Sid: "AllowAnyPrincipal2",
      Effect: "Allow",
      Action: ["s3:*"], // Noncompliant
      Resource: bucket.arnForObjects("*"),
      Principal: { AWS: "*" },
    });
    bucket.addToResourcePolicy(policyStatementFromJson);

    // Policy document created from PolicyDocument.fromJson
    const policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "AnyPrincipal",
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: "*",
          Principal: {
            AWS: [
              "*", // Noncompliant
            ],
          },
        },
        {
          Sid: "StarPrincipal",
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: "*",
          Principal: "*", // Noncompliant
        },
        {
          Sid: "AccountRootPrincipal",
          Effect: "Allow",
          Action: ["kms:*"],
          Resource: "*",
          Principal: { AWS: new iam.AccountRootPrincipal().arn }, // Compliant
        },
      ],
    };

    const policyDocumentFromJson = iam.PolicyDocument.fromJson(policyDocument);
    new kms.Key(this, "S6270Key", { policy: policyDocumentFromJson });
  }
}
