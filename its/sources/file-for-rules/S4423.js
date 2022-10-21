import agw from 'aws-cdk-lib/aws-apigateway';

new agw.CfnDomainName(this, 'Example', {
  securityPolicy: 'TLS_1_0' // Sensitive
});
