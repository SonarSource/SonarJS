import * as cdk from 'aws-cdk-lib';
import {aws_iam as iam, aws_lambda as lambda} from 'aws-cdk-lib';

export class LoginStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const attacker1 = new iam.User(this, "attacker1")
    const vulnerable = new iam.User(this, "vulnerable")

    attacker1.attachInlinePolicy(new iam.Policy(this, 'NoncompliantPolicy1', {
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:UpdateLoginProfile"],
//                ^^^^^^^^^^^^^^^^^^^^^^^^> {{Permissions are granted on all resources.}}
        resources: ["arn:aws:iam::501215020883:user/*"], // Noncompliant {{This policy is vulnerable to the "iam:UpdateLoginProfile" privilege escalation vector. Remove permissions or restrict the set of resources they apply to.}}
//                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      })],
    }));

    attacker1.attachInlinePolicy(new iam.Policy(this, 'NoncompliantPolicy2', {
      statements: [new iam.PolicyStatement({
        actions: ["iam:UpdateLoginProfile"],
//                ^^^^^^^^^^^^^^^^^^^^^^^^> {{Permissions are granted on all resources.}}
        resources: ["*"],  // Noncompliant {{This policy is vulnerable to the "iam:UpdateLoginProfile" privilege escalation vector. Remove permissions or restrict the set of resources they apply to.}}
//                  ^^^
      })],
    }));

    const attacker2 = new iam.User(this, "attacker2")

    attacker2.attachInlinePolicy(new iam.Policy(this, 'CompliantPolicy', {
      statements: [new iam.PolicyStatement({
        actions: ["iam:UpdateLoginProfile"],
        resources: [attacker2.userArn],  // Compliant
      })],
    }));

    const role = new iam.Role(this, "MyRole", {
        assumedBy: new iam.ServicePrincipal("sns.amazonaws.com")
      });

    role.addToPolicy(iam.PolicyStatement.fromJson({
        'Action': 'iam:UpdateLoginProfile',
        'Effect': 'Allow',
        'Resource': '*'  // Noncompliant
      }));

    const user = new iam.User(this, "MyUser");
    role.addToPolicy(iam.PolicyStatement.fromJson({
        'Action': 'iam:UpdateLoginProfile',
        'Effect': 'Allow',
        'Resource': user.userArn  // Compliant
      }));
  }

}

export class CompliantStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const attacker2 = new iam.User(this, "attacker2")

    attacker2.attachInlinePolicy(new iam.Policy(this, 'CompliantPolicy', {
      statements: [new iam.PolicyStatement({
        actions: ["iam:UpdateLoginProfile"],
        resources: [attacker2.userArn],  // Compliant
      })],
    }));

    attacker2.attachInlinePolicy(new iam.Policy(this, 'NoncompliantPolicy1', {
      statements: [new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ["iam:UpdateLoginProfile"],
        resources: ["arn:aws:iam::501215020883:user/*"]
      })],
    }));

    attacker2.attachInlinePolicy(new iam.Policy(this, 'NoncompliantPolicy1', {
      statements: [new iam.PolicyStatement({
        actions: ["iam:unknown"],
        resources: ["arn:aws:iam::501215020883:user/*"]
      })],
    }));

  }
}

const DUMMY_LAMBDA_CODE = `
def handler(event, context):
    pass
`;

export class LambdaStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const privilegedRole = new iam.Role(this, "PrivilegedRole", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        description: "An example privileged Role"
      }
    );

    // Defines an AWS Lambda resource
    const lambda1 = new lambda.Function(this, 'ExampleLambda', {
        runtime: lambda.Runtime.PYTHON_3_7,
        code: new lambda.InlineCode(DUMMY_LAMBDA_CODE),
        handler: 'lambda.handler',
        role: privilegedRole
      }
    );

    new iam.ManagedPolicy(this, "NoncompliantPolicy", {
        document: iam.PolicyDocument.fromJson({
            'Statement': [
              {
                'Action': 'lambda:UpdateFunctionCode',
                'Effect': 'Allow',
                'Resource': '*'  //Noncompliant
              }
            ],
            'Version': '2012-10-17'
          }
        )
      }
    );

    new iam.ManagedPolicy(this, "CompliantPolicy", {
        document: iam.PolicyDocument.fromJson({
            'Statement': [
              {
                'Action': 'lambda:UpdateFunctionCode',
                'Effect': 'Allow',
                'Resource': lambda1.functionArn,  //Compliant
              }
            ],
            'Version': '2012-10-17'
          }
        )
      }
    );
  }
}
