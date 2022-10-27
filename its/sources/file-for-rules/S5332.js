import { CfnReplicationGroup } from "aws-cdk-lib/aws-elasticache";
import { Stream, CfnStream, StreamEncryption } from "aws-cdk-lib/aws-kinesis";
import { LoadBalancer, LoadBalancingProtocol, CfnLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancing';
import { ApplicationListener, ApplicationProtocol, ApplicationLoadBalancer, NetworkLoadBalancer, Protocol, NetworkListener, CfnListener } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

new CfnReplicationGroup(this, "unencrypted", {
  replicationGroupDescription: "description",
  transitEncryptionEnabled: false, // Sensitive: Make sure that disabling transit encryption is safe here.
});

new Stream(this, "stream-explicit-unencrypted", {
  encryption: StreamEncryption.UNENCRYPTED, // Sensitive: Make sure that disabling stream encryption is safe here.
});

new CfnStream(this, "stream-explicit-unencrypted"); // Sensitive: Make sure that disabling stream encryption is safe here.


const loadBalancer = new LoadBalancer(this, 'elb-tcp-dict', {
  vpc,
  internetFacing: true,
  healthCheck: {
    port: 80,
  },
  listeners: [
    {
      externalPort:10000,
      externalProtocol: LoadBalancingProtocol.TCP, // Sensitive
      internalPort:10000
    },
    unsafeListener, // Sensitive
    undefined
  ]
});

loadBalancer.addListener({
  externalPort:10001,
  externalProtocol:LoadBalancingProtocol.TCP, // Sensitive
  internalPort:10001
});

new CfnLoadBalancer(this, 'cfn-elb-tcp', {
  listeners: [{
    instancePort: '1000',
    loadBalancerPort: '1000',
    protocol: 'tcp', // Sensitive
    sslCertificateId: ''
  }]
});

const alb = new ApplicationLoadBalancer(this, 'ALB', {
  vpc: vpc,
  internetFacing: true
});

alb.addListener('listener-http-default', {
  port: 8080,// Sensitive
  open: true
});

new ApplicationListener(this, 'listener-http-explicit-constructor', {
  loadBalancer: alb,
  protocol: ApplicationProtocol.HTTP, // Sensitive
  port: 8080,
  open: true
});

const nlb = new NetworkLoadBalancer(this, 'nlb', {
  vpc: vpc,
  internetFacing: true
});

nlb.addListener('listener-tcp-default', {// Sensitive
  port: 1234
});

new NetworkListener(this, 'listener-tcp-implicit', {  // Sensitive
  loadBalancer: nlb,
  port: 8080
});

new CfnListener(this, 'listener-tcp', {
  defaultActions: defaultActions,
  loadBalancerArn: alb.loadBalancerArn,
  protocol: "TCP", // Sensitive
  port: 80
});
