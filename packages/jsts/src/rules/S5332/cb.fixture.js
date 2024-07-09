import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { CfnReplicationGroup } from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';
import { Stream, CfnStream, StreamEncryption } from 'aws-cdk-lib/aws-kinesis';
import { LoadBalancer, LoadBalancingProtocol, CfnLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancing';
import { ApplicationListener, ApplicationProtocol, ApplicationLoadBalancer, NetworkLoadBalancer, Protocol, NetworkListener, CfnListener } from 'aws-cdk-lib/aws-elasticloadbalancingv2';

function compliant() {

  new CfnReplicationGroup(this, 'EncryptedGroup', unknownProps);

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: { ...unknownProps }
  });

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: unknownEncryption
  });

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: true
  });

  new CfnReplicationGroup(this, 'EncryptedGroup', {
    'transitEncryptionEnabled': true
  });

  const encrypt = true;
  new CfnReplicationGroup(this, 'EncryptedGroup', {
    transitEncryptionEnabled: encrypt
  });

  const groupProps = { transitEncryptionEnabled: encrypt };
  new CfnReplicationGroup(this, 'EncryptedGroup', {
    ...groupProps
  });

  const groupArgs = [this, 'EncryptedGroup', { transitEncryptionEnabled: false} ];
  new CfnReplicationGroup(...groupArgs); // FN - not supporting arguments spread
}

function non_compliant() {

  new CfnReplicationGroup(this, 'UnencryptedGroup'); // Noncompliant {{Make sure that disabling transit encryption is safe here.}}
//    ^^^^^^^^^^^^^^^^^^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', undefined); // Noncompliant
//    ^^^^^^^^^^^^^^^^^^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', {}); // Noncompliant
//                                                  ^^
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled: false // Noncompliant
//                            ^^^^^
  });
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    'transitEncryptionEnabled': false // Noncompliant
//                              ^^^^^
  });

  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    'transitEncryptionEnabled': undefined // Noncompliant
  });

  const unencrypt = false;
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled: unencrypt // Noncompliant
//                            ^^^^^^^^^
  });

  const transitEncryptionEnabled = false;
  new CfnReplicationGroup(this, 'UnencryptedGroup', {
    transitEncryptionEnabled // Noncompliant
//  ^^^^^^^^^^^^^^^^^^^^^^^^
  });

  const topicProps = { transitEncryptionEnabled: false };

  new CfnReplicationGroup(this, 'UnencryptedGroup', { // Noncompliant
    ...topicProps
  });
}

// AWS CDK Stream

class S5332NonCompliantKinesisStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    new Stream(this, 'stream-explicit-unencrypted', {
      encryption: StreamEncryption.UNENCRYPTED // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    });

    const encryption = StreamEncryption.UNENCRYPTED;
    new Stream(this, 'stream-explicit-unencrypted', {
      encryption // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//    ^^^^^^^^^^
    });
    new Stream(this, 'stream-explicit-unencrypted', {
      ...unknown,
      encryption // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//    ^^^^^^^^^^
    });

    new CfnStream(this, 'stream-explicit-unencrypted'); // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//      ^^^^^^^^^
    new CfnStream(this, 'stream-explicit-unencrypted', undefined); // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//      ^^^^^^^^^

    new CfnStream(this, 'stream-explicit-unencrypted', {}); // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//                                                     ^^

    new CfnStream(this, 'cfnstream-explicit-unencrypted', {
      streamEncryption: undefined // Noncompliant {{Make sure that disabling stream encryption is safe here.}}
//                      ^^^^^^^^^
    });
  }
}

class S5332CompliantKinesisStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const encryptionKey = new Key(this, 'Key', {
      enableKeyRotation: true,
    });

    new Stream(this, 'stream-implicit-encrypted'); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', undefined); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', foo()); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', unknown); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', {}); // Compliant, encryption is the default

    new Stream(this, 'stream-implicit-encrypted', {
      encryption: undefined  // Compliant, encryption is the default
    });

    new Stream(this, 'stream-explicit-encrypted-selfmanaged', {
      encryption: StreamEncryption.KMS, // Compliant
      encryptionKey: encryptionKey,
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      encryption: StreamEncryption.MANAGED // Compliant
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      ...unknown,
      encryption: StreamEncryption.MANAGED // Compliant
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      encryption: unknown // Compliant
    });

    new Stream(this, 'stream-explicit-encrypted-managed', {
      ...unknown,
      encryption: unknown // Compliant
    });

    const encryption = StreamEncryption.MANAGED;
    new Stream(this, 'stream-explicit-encrypted-managed', {
      encryption // Compliant
    });

    new CfnStream(this, 'cfnstream-explicit-encrypted', { // Compliant
      streamEncryption: {
        encryptionType: 'encryptionType',
        keyId: encryptionKey.keyId,
      }
    });
  }
}

function ELB() {
  new LoadBalancer(this, 'elb-tcp-dict', {
    vpc,
    internetFacing: true,
    healthCheck: {
      port: 80,
    },
    listeners: unknownListeners
  });

  const unsafeListener = {
    externalPort:10000,
    externalProtocol: LoadBalancingProtocol.TCP,
    internalPort:10000
  };

  const loadBalancer = new LoadBalancer(this, 'elb-tcp-dict', {
    vpc,
    internetFacing: true,
    healthCheck: {
      port: 80,
    },
    listeners: [
      {
        externalPort:10000,
        externalProtocol: LoadBalancingProtocol.TCP, // Noncompliant
        //                ^^^^^^^^^^^^^^^^^^^^^^^^^
        internalPort:10000
      },
      unsafeListener, // Noncompliant
      undefined
      ]
  });

  loadBalancer.addListener(unsafeListener); // Noncompliant
  loadBalancer.addListener(unknownListener);
  loadBalancer.addListener({
    externalPort:10001,
    externalProtocol:LoadBalancingProtocol.TCP, // Noncompliant
    internalPort:10001
  });
  loadBalancer.addListener({
    externalPort:10001,
    externalProtocol:LoadBalancingProtocol.SSL,
    internalPort:10001
  });
  loadBalancer.addListener({
    externalPort:10002,
    externalProtocol:LoadBalancingProtocol.HTTP, // Noncompliant
    internalPort:10002
  });

  new CfnLoadBalancer(this, 'cfn-elb-tcp');
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: []});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: unknownListeners});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: undefined});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: [unknownListener]});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: [{protocol: undefined}]});
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: [{protocol: 'TCP'}]}); // Noncompliant

  new CfnLoadBalancer(this, 'cfn-elb-tcp', {
    listeners: [{
      instancePort: '1000',
      loadBalancerPort: '1000',
      protocol: 'tcp', // Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
      sslCertificateId: ''
    }]
  });
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {
    listeners: [{
      instancePort: '1000',
      loadBalancerPort: '1000',
      protocol: 'ssl',
      sslCertificateId: ''
    },{
      instancePort: '1000',
      loadBalancerPort: '1000',
      sslCertificateId: ''
    },{
      instancePort: '1000',
      loadBalancerPort: '1000',
      protocol: 'HTTP', // Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
      //        ^^^^^^
      sslCertificateId: ''
    },{
      instancePort: '1000',
      loadBalancerPort: '1000',
      protocol: 'tcp', // Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
      //        ^^^^^
      sslCertificateId: ''
    }]
  });
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {
    listeners: [{
      instancePort: '1000',
      loadBalancerPort: '1000',
      protocol: 'ssl',
      sslCertificateId: ''
    }]
  });
  new CfnLoadBalancer(this, 'cfn-elb-tcp', {listeners: [{instancePort: '1000'}]});
}

function ELBv2() {
  const alb = new ApplicationLoadBalancer(this, 'ALB', {
    vpc: vpc,
    internetFacing: true
  });

  alb.addListener('listener-http-default', {
    port: 8080,// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
    //    ^^^^
    open: true
  });

  alb.addListener('listener-http-explicit', {
    protocol: ApplicationProtocol.HTTP, // Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
//            ^^^^^^^^^^^^^^^^^^^^^^^^
    port: 8080,
    open: true
  });
  alb.addListener('listener-undefined');
  alb.addListener('listener-unknown', unknownParams);

  const listenerParams = {
    protocol: ApplicationProtocol.HTTP
  }
  const listenerParams2 = {
    protocol: undefined
  }
  const listenerParams3 = {
    port: 8080
  }

  alb.addListener('listener-http-explicit', listenerParams); //NonCompliant
  //                                        ^^^^^^^^^^^^^^
  alb.addListener('listener-http-explicit', listenerParams2);
  alb.addListener('listener-http-explicit', listenerParams3); //NonCompliant
  //                                        ^^^^^^^^^^^^^^^

  alb.addListener('listener-https-explicit', {
    protocol: ApplicationProtocol.HTTPS,
    port: 8080,
    open: true
  });

  new ApplicationListener(this, 'listener-http-implicit-constructor', {
    loadBalancer: alb,
    port: 8080, //Noncompliant
//        ^^^^
    open: true
  });

  new ApplicationListener(this, 'listener-http-implicit-constructor', listenerParams); //NonCompliant
  //                                                                  ^^^^^^^^^^^^^^
  new ApplicationListener(this, 'listener-http-implicit-constructor', listenerParams2);
  new ApplicationListener(this, 'listener-http-implicit-constructor', listenerParams3); //NonCompliant
  //                                                                  ^^^^^^^^^^^^^^^

  new ApplicationListener(this, 'listener-http-explicit-constructor', {
    loadBalancer: alb,
    protocol: ApplicationProtocol.HTTP, // Noncompliant
//            ^^^^^^^^^^^^^^^^^^^^^^^^
    port: 8080,
    open: true
  });

  const nlb = new NetworkLoadBalancer(this, 'nlb', {
    vpc: vpc,
    internetFacing: true
  });

  nlb.addListener('listener-tcp-default', {// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
    port: 1234
  });

  const nlbParams = {protocol: Protocol.TCP}
  const nlbParams2 = {protocol: Protocol.TLS}
  const nlbParams3 = {certificates: [], protocol: Protocol.TLS}
  const nlbParams4 = {certificates: []}
  const nlbParams5 = {certificates: ['certificate']}
  const nlbParams6 = {}

  nlb.addListener('listener-tcp-default', nlbParams);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  nlb.addListener('listener-tcp-default', nlbParams2);
  nlb.addListener('listener-tcp-default', nlbParams3);
  nlb.addListener('listener-tcp-default', nlbParams4);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  nlb.addListener('listener-tcp-default', nlbParams5);
  nlb.addListener('listener-tcp-default', nlbParams6);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  nlb.addListener('listener-tcp-default', nlbParams7);
  nlb.addListener('listener-tcp-default');// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}

  nlb.addListener('listener-tcp-explicit', {
    protocol: Protocol.TCP,// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
    port: 1234
  });

  nlb.addListener('listener-tcp-implicit', {
    certificates: [], // Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
//                ^^
    port: 1234
  });

  const emptyArray = [];

  nlb.addListener('listener-tcp-implicit', {
    certificates: emptyArray, // Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
//                ^^^^^^^^^^
    port: 1234
  });

  nlb.addListener('listener-tcp-implicit', {
    certificates: ['foo'],
    port: 1234
  });

  new NetworkListener(this, 'listener-tcp-implicit', {  // Noncompliant
    loadBalancer: nlb,
    port: 8080
  });

  new NetworkListener(this, 'listener-tcp-explicit', {
    loadBalancer: nlb,
    protocol: Protocol.TCP, //Noncompliant
    port: 8080
  });
  new NetworkListener(this, 'listener', nlbParams);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new NetworkListener(this, 'listener', nlbParams2);
  new NetworkListener(this, 'listener', nlbParams3);
  new NetworkListener(this, 'listener', nlbParams4);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new NetworkListener(this, 'listener', nlbParams5);
  new NetworkListener(this, 'listener', nlbParams6);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new NetworkListener(this, 'listener', nlbParams7);
  new NetworkListener(this, 'listener');// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}


  const cfnListenerParams = {protocol: 'tcp'}
  const cfnListenerParams2 = {protocol: 'tls'}
  const cfnListenerParams3 = {protocol: 'https'}
  const cfnListenerParams4 = {protocol: 'TCP_UDP'}
  const cfnListenerParams5 = {protocol}
  const cfnListenerParams6 = {}
  const cfnListenerParams7 = {protocol: 'udp'}
  const cfnListenerParams8 = {protocol: 'tcp_udp'}

  new CfnListener(this, 'listener-http', {
    defaultActions: defaultActions,
    loadBalancerArn: alb.loadBalancerArn,
    protocol: "HTTP", // Noncompliant
    port: 80
  });

  new CfnListener(this, 'listener-tcp', {
    defaultActions: defaultActions,
    loadBalancerArn: alb.loadBalancerArn,
    protocol: "TCP", // Noncompliant
    port: 80
  });

  new CfnListener(this, 'listener-tcp', {
    defaultActions: defaultActions,
    loadBalancerArn: alb.loadBalancerArn,
    protocol: "tcp", // Noncompliant
    port: 80
  });

  new CfnListener(this, 'listener', cfnListenerParams);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new CfnListener(this, 'listener', cfnListenerParams2);
  new CfnListener(this, 'listener', cfnListenerParams3);
  new CfnListener(this, 'listener', cfnListenerParams4);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new CfnListener(this, 'listener', cfnListenerParams5);
  new CfnListener(this, 'listener', cfnListenerParams6);
  new CfnListener(this, 'listener', cfnListenerParams7);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new CfnListener(this, 'listener', cfnListenerParams8);// Noncompliant {{Make sure that using network protocols without an SSL/TLS underlay is safe here.}}
  new CfnListener(this, 'listener', cfnListenerParams9);
}
