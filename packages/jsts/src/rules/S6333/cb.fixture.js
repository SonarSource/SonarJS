import {aws_apigateway as apigateway, aws_apigatewayv2 as apigatewayv2, Stack} from "aws-cdk-lib"

export class CfnRestApi2Stack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    const api = new apigatewayv2.CfnApi(this, "api", {
      name: "CfnApiV2",
      protocolType: "HTTP",
      routeKey: "GET /test",
      target: "http://example.org"
    })

    const httpIntegration = new apigatewayv2.CfnIntegration(
      this,
      "HttpIntegration",
      {
        apiId: api.ref,
        integrationType: "HTTP_PROXY",
        integrationMethod: "ANY",
        integrationUri: `https://example.org/`,
        payloadFormatVersion: "1.0",
      }
    );

    new apigatewayv2.CfnRoute(this, "default-no-auth", { // Noncompliant {{Omitting "authorizationType" disables authentication. Make sure it is safe here.}}
      apiId: api.ref,
      routeKey: "GET /default-no-auth",
      target: `integrations/${httpIntegration.ref}`
    })

    new apigatewayv2.CfnRoute(this, "no-auth", {
      apiId: api.ref,
      routeKey: "GET /no-auth",
      authorizationType: "NONE", // Noncompliant {{Make sure that creating public APIs is safe here.}}
//                       ^^^^^^
      target: `integrations/${httpIntegration.ref}`
    })

    new apigatewayv2.CfnRoute(this, "auth", {
      apiId: api.ref,
      routeKey: "POST /auth",
      authorizationType: "AWS_IAM",  // Compliant
      target: `integrations/${httpIntegration.ref}`
    })

    new apigatewayv2.CfnStage(this, 'Stage', {
      apiId: api.ref,
      stageName: 'prod',
      autoDeploy: true
    })

  }
}

export class CfnRestApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    const api = new apigateway.CfnRestApi(this, "api", {
      name: "CfnRestApi"
    })

    const cfnResource = new apigateway.CfnResource(this, "resource", {
      restApiId: api.ref,
      parentId: api.getAtt("RootResourceId").toString(),
      pathPart: "test"
    })

    const method = new apigateway.CfnMethod(this, "no-auth", {
      httpMethod: "GET",
      resourceId: cfnResource.ref,
      restApiId: api.ref,
      authorizationType: "NONE",  // Noncompliant {{Make sure that creating public APIs is safe here.}}
//                       ^^^^^^
      integration: {
        type: "MOCK"
      }
    })

    new apigateway.CfnMethod(this, "auth", {
      httpMethod: "POST",
      resourceId: cfnResource.ref,
      restApiId: api.ref,
      authorizationType: "AWS_IAM",  // Compliant
      integration: {
        type: "MOCK"
      }
    })

    const deploy = new apigateway.CfnDeployment(this, 'Deployment', {
      restApiId: api.ref,
      stageName: "prod"
    });
    deploy.node.addDependency(method)

  }
}

export class RestApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props)

    this.testDefault()
    this.testSecureDefault1()
    this.testSecureDefault2()
    this.testUnsecureDefault()
  }

  testDefault() {
    const api = new apigateway.RestApi(this, "RestApi")
    const test = api.root.addResource("test")
    test.addMethod(
      "GET",
      new apigateway.HttpIntegration("https://example.org"),
      /* options */ {
        authorizationType: apigateway.AuthorizationType.NONE // Noncompliant {{Make sure that creating public APIs is safe here.}}
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      }
    )

    test.addMethod(
      "POST",
      new apigateway.HttpIntegration("https://example.org"),
      /* options */ {
        authorizationType: apigateway.AuthorizationType.IAM // Compliant
      }
    )

    const testChild = test.addResource("testchild")

    testChild.parentResource?.addMethod(
      "HEAD",
      new apigateway.HttpIntegration("https://example.org"),
      /* options */ {
        authorizationType: apigateway.AuthorizationType.NONE // Noncompliant {{Make sure that creating public APIs is safe here.}}
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      }
    )

    test.getResource("testchild")?.addMethod(
      "PATCH",
      new apigateway.HttpIntegration("https://example.org"),
      /* options */ {
        authorizationType: apigateway.AuthorizationType.NONE // Noncompliant {{Make sure that creating public APIs is safe here.}}
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      }
    )

    test.api.root.addMethod( // False Negative; no authorization by default
      "DELETE"
    )
  }

  testSecureDefault1() {
    const api = new apigateway.RestApi(this, "RestApiDefault1", {
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM
      }
    })

    const test = api.root.addResource("test")
    test.addMethod(
      "GET",
      new apigateway.HttpIntegration("https://example.org"),
      /* options */ {
        authorizationType: apigateway.AuthorizationType.NONE // Noncompliant {{Make sure that creating public APIs is safe here.}}
//                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      }
    )

    test.addMethod(  // Compliant because of defaultMethodOptions
      "POST"
    )

    test.addMethod(  // Compliant because of defaultMethodOptions
      "POST",
      new apigateway.HttpIntegration("https://example.org"),
      {operationName: 'operation'}
    )
  }

  testSecureDefault2() {
    const api = new apigateway.RestApi(this, "RestApiDefault2")

    const test = api.root.addResource("test", {
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.IAM
      }
    })

    test.addMethod(  // Compliant because of default_method_options
      "GET"
    )

    api.root.addMethod(
      "POST",
      new apigateway.HttpIntegration("https://example.org"),
      {operationName: 'operation'} // Noncompliant {{Omitting "authorizationType" disables authentication. Make sure it is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
  }

  testUnsecureDefault() {
    const options = {
      authorizationType: apigateway.AuthorizationType.NONE
    }

    const api = new apigateway.RestApi(this, "RestApiUnsecureDefault", {
      defaultMethodOptions: options
    })

    const authorizationType = apigateway.AuthorizationType.IAM;
    const test = api.root.addResource("test1", {
      defaultMethodOptions: {
        authorizationType
      }
    })

    test.addMethod(  // Compliant because of default_method_options
      "GET"
    )

    api.root.addResource("test2").addMethod("GET") // Noncompliant {{Make sure that creating public APIs is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  }

  testUnknown() {
    const api = new apigateway.RestApi(this, "RestApiUnknown")

    api.root.addResource("test2").addMethod("GET", integration, unknown) // Compliant, value is unknown
  }

  testUnknownDefault(options) {
    const api = new apigateway.RestApi(this, "RestApiDefault1", {
      defaultMethodOptions: unknown
    })

    api.root.addResource("test2").addMethod("GET") // Noncompliant {{Omitting "authorizationType" disables authentication. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    api.root.addResource("test2").addMethod("GET", integration, options) // Compliant
  }
}
