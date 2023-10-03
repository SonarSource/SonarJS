import {
  aws_apigateway as apigateway,
  aws_apigatewayv2 as apigatewayv2,
  Stack,
} from "aws-cdk-lib";

export class CfnRestApi2Stack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new apigatewayv2.CfnApi(this, "api", {
      name: "CfnApiV2",
      protocolType: "HTTP",
      routeKey: "GET /test",
      target: "http://example.org",
    });
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
    new apigatewayv2.CfnRoute(this, "default-no-auth", {
      apiId: api.ref,
      routeKey: "GET /default-no-auth",
      target: `integrations/${httpIntegration.ref}`,
    });
  }
}

export class CfnRestApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new apigateway.CfnRestApi(this, "api", {
      name: "CfnRestApi",
    });
    const cfnResource = new apigateway.CfnResource(this, "resource", {
      restApiId: api.ref,
      parentId: api.getAtt("RootResourceId").toString(),
      pathPart: "test",
    });
    new apigateway.CfnMethod(this, "no-auth", {
      httpMethod: "GET",
      resourceId: cfnResource.ref,
      restApiId: api.ref,
      authorizationType: "NONE",
      integration: {
        type: "MOCK",
      },
    });
  }
}

export class RestApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new apigateway.RestApi(this, "RestApi");
    const test = api.root.addResource("test");
    test.addMethod(
      "GET",
      new apigateway.HttpIntegration("https://example.org"),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
      }
    );
  }
}
