import { aws_iam as iam } from "aws-cdk-lib";

const attacker = new iam.User(this, "attacker");

attacker.attachInlinePolicy(
  new iam.Policy(this, "NoncompliantPolicy", {
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:UpdateLoginProfile"],
        resources: ["*"], // Noncompliant, attacker can update vulnerable's password
      }),
    ],
  })
);

attacker.attachInlinePolicy(
  new iam.Policy(this, "CompliantPolicy", {
    statements: [
      new iam.PolicyStatement({
        actions: ["iam:UpdateLoginProfile"],
        resources: [attacker.userArn], // Compliant
      }),
    ],
  })
);

const role = new iam.Role(this, "MyRole", {
  assumedBy: new iam.ServicePrincipal("sns.amazonaws.com"),
});

role.addToPolicy(
  iam.PolicyStatement.fromJson({
    Action: "iam:UpdateLoginProfile",
    Effect: "Allow",
    Resource: "*", // Noncompliant
  })
);

const user = new iam.User(this, "MyUser");

role.addToPolicy(
  iam.PolicyStatement.fromJson({
    Action: "iam:UpdateLoginProfile",
    Effect: "Allow",
    Resource: user.userArn, // Compliant
  })
);

iam.ManagedPolicy(this, "NoncompliantPolicy", {
  document: iam.PolicyDocument.fromJson({
    Statement: [
      {
        Action: "lambda:UpdateFunctionCode",
        Effect: "Allow",
        Resource: "*", // Noncompliant
      },
    ],
    Version: "2012-10-17",
  }),
});

iam.ManagedPolicy(this, "CompliantPolicy", {
  document: iam.PolicyDocument.fromJson({
    Statement: [
      {
        Action: "lambda:UpdateFunctionCode",
        Effect: "Allow",
        Resource:
          "arn:aws:lambda:us-east-2:123456789012:function:my-function:1", // Compliant
      },
    ],
    Version: "2012-10-17",
  }),
});
