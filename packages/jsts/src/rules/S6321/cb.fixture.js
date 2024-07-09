import { aws_ec2 as ec2 } from 'aws-cdk-lib'

const badPort = 22;
const goodPort = 1234;

const goodIpV4 = '192.0.2.0/24';
const goodIpV6 = '::1';

const instance = new ec2.Instance(this, 'default-own-security-group',{
  instanceType: nanoT2,
  machineImage: ec2.MachineImage.latestAmazonLinux(),
  vpc: vpc,
  instanceName: 'test-instance'
});
instance.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

instance.connections.allowFrom(
  ec2.Peer.anyIpv4(), // Noncompliant
  ec2.Port.tcp(22),
  'description'
);

const badIpV4 = '0.0.0.0/0';
instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4),// Noncompliant
  ec2.Port.tcpRange(/* startPort */ 1, /*endPort*/ 1024),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv4('192.0.2.0/24'),
  ec2.Port.tcpRange(/* startPort */ 1, /*endPort*/ 1024),
  'description'
);
instance.connections.allowFrom(
  ec2.Peer.ipv4('192.0.2.0/24'),
  ec2.Port.tcpRange(unknownStartPort, unknownEndPort),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv6('::/0'),// Noncompliant
  ec2.Port.tcpRange(/* startPort */ 1, /*endPort*/ 1024),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv6('::1'),
  ec2.Port.tcpRange(/* startPort */ 1, /*endPort*/ 1024),
  'description'
);

instance.connections.allowFrom(
  unknownPort,
  ec2.Port.tcpRange(/* startPort */ 1, /*endPort*/ 1024),
  'description'
);
instance.connections.allowFromAnyIpv4( // Noncompliant
  ec2.Port.tcp(3389),
  'description'
);
instance.connections.allowFromAnyIpv4(
  ec2.Port.tcp(unknownPort),
  'description'
);
instance.connections.allowFromAnyIpv4(
  ec2.Port.tcp(undefined),
  'description'
);
instance.connections.allowFromAnyIpv4( // Noncompliant
  ec2.Port.allTcp(),
  'description'
);
instance.connections.allowFromAnyIpv4( // Noncompliant
  ec2.Port.allTraffic(),
  'description'
);
instance.connections.allowFromAnyIpv4(
  unknownPort,
  'description'
);

instance.connections.allowFromAnyIpv4(  // Compliant
  ec2.Port.tcp(goodPort),
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(goodIpV4), // Compliant
  ec2.Port.tcp(badPort),
);

instance.connections.allowFrom(
  unknownIP, // Compliant
  ec2.Port.tcp(badPort),
);

instance.connections.allowFrom(
  undefined,
  ec2.Port.tcp(badPort),
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4), // Noncompliant
  new ec2.Port({protocol: ec2.Protocol.TCP, fromPort: 22, toPort: 22}),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4),
  new ec2.Port({protocol: ec2.Protocol.TCP, fromPort: goodPort, toPort: goodPort}),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4),
  new ec2.Port({fromPort: 22, toPort: 22}),
  'description'
);


instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4),
  new ec2.Port(unknownPortParams),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4), // Noncompliant
  ec2.Port({protocol: ec2.Protocol.ALL, fromPort: 20, toPort: 25}),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4), // Compliant
  ec2.Port({protocol: ec2.Protocol.UDP, fromPort: 20, toPort: 25}),
  'description'
);

instance.connections.allowFrom(
  ec2.Peer.ipv4(badIpV4), // Compliant
  ec2.Port({protocol: ec2.Protocol.TCP, fromPort: goodPort, toPort: goodPort}),
  'description'
);

const connection = new ec2.Connections({
  defaultPort: ec2.Port.tcp(22),
  securityGroups: [securityGroup]
});

connection.allowDefaultPortFromAnyIpv4('Allows SSH from all IPv4'); // Noncompliant
connection.allowDefaultPortFrom(ec2.Peer.anyIpv4(), 'Allows SSH from all IPv4'); // Noncompliant

const connection2 = new ec2.Connections({
  defaultPort:ec2.Port.tcp(1234),
  securityGroups:[securityGroup2]
});

connection2.allowDefaultPortFromAnyIpv4('Allows 1234 from all IPv4'); // Compliant
connection2.allowDefaultPortFrom(ec2.Peer.anyIpv4(), 'Allows 1234 from all IPv4'); // Compliant


const securityGroup3 = new ec2.SecurityGroup(this, 'custom-security-group', {
  vpc: vpc
});

securityGroup3.addIngressRule(
  ec2.Peer.anyIpv4(), // Noncompliant
  ec2.Port.tcpRange(1, 1024)
);

securityGroup3.addIngressRule(
  ec2.Peer.anyIpv4(),// Compliant, port is safe
  ec2.Port.tcpRange(1024, 1048)
);

const badIpV4_2 = '0.0.0.0/0';// Noncompliant
const nonCompliantIngress = {
  ipProtocol: '6',
  cidrIp: badIpV4_2,
  fromPort: 22,
  toPort: 22
};
new ec2.CfnSecurityGroup(this, 'cfn-based-security-group', undefined);
new ec2.CfnSecurityGroup(this, 'cfn-based-security-group', unknownParams);

new ec2.CfnSecurityGroup(
  this,
  'cfn-based-security-group', {
    groupDescription: 'cfn based security group',
    groupName: 'cfn-based-security-group',
    vpcId: vpc.vpcId,
    securityGroupIngress: undefined
  });

new ec2.CfnSecurityGroup(
  this,
  'cfn-based-security-group', {
    groupDescription: 'cfn based security group',
    groupName: 'cfn-based-security-group',
    vpcId: vpc.vpcId,
    securityGroupIngress: unknownIngressGroups
  });

new ec2.CfnSecurityGroup(
  this,
  'cfn-based-security-group', {
    groupDescription: 'cfn based security group',
    groupName: 'cfn-based-security-group',
    vpcId: vpc.vpcId
  });

new ec2.CfnSecurityGroup(
  this,
  'cfn-based-security-group', {
    groupDescription: 'cfn based security group',
    groupName: 'cfn-based-security-group',
    vpcId: vpc.vpcId,
    securityGroupIngress: [
      {
        ipProtocol: '6',
        cidrIp: '0.0.0.0/0', // Noncompliant
        fromPort: 22,
        toPort: 22
      },
      {
        ipProtocol: 'tcp',
        cidrIp: '0.0.0.0/0', // Noncompliant
        fromPort: 3389,
        toPort: 3389
      },
      {
        ipProtocol: unknownProtocol,
        cidrIpv6: '::/0'
      },
      {
        ipProtocol: undefined,
        cidrIpv6: '::/0'
      },
      {
        ipProtocol: '-1',
        cidrIpv6: '::/0' // Noncompliant
      },
      {
        ipProtocol: 'tcp',
        cidrIpv6: '::/0' // Compliant
      },
      {
        ipProtocol: 'tcp',
        fromPort: 3380,
        toPort: 3390,
        cidrIpv6: '::/0' // Noncompliant
      },
      {
        ipProtocol: '-1',
        cidrIpv6: goodIpV6
      },
      {
        ipProtocol: '6',
        cidrIp: '192.0.2.0/24', // Compliant
        fromPort: 22,
        toPort: 22
      },
      {
        ipProtocol: '6',
        cidrIp: unknownIP, // Compliant
        fromPort: 22,
        toPort: 22
      },
      {
        ipProtocol: '6',
        cidrIp: undefined,
        fromPort: 22,
        toPort: 22
      },
      {
        ipProtocol: 'tcp',
        cidrIp: '0.0.0.0/0', // Compliant, port is safe
        fromPort: 1024,
        toPort: 1048
      },
      unknownIngress,
      nonCompliantIngress
    ]
  }
);

new ec2.CfnSecurityGroupIngress(
  this,
  'ingress-all-ip-tcp-ssh', {
    ipProtocol: 'tcp',
    cidrIp: '0.0.0.0/0', // Noncompliant
    fromPort: 22,
    toPort: 22,
    groupId: securityGroup.attrGroupId
  });

const badIpV6 = '::/0';// Noncompliant

new ec2.CfnSecurityGroupIngress(
  this,
  'ingress-all-ipv6-all-tcp', {
    ipProtocol: '-1',
    cidrIpv6: badIpV6,
    groupId: securityGroup.attrGroupId
  });

new ec2.CfnSecurityGroupIngress(
  this,
  'ingress-all-ipv4-tcp-http', {
    ipProtocol: '6',
    cidrIp: '0.0.0.0/0',
    fromPort: 80, // Compliant
    toPort: 80,
    groupId: securityGroup.attrGroupId
  });

const compliantIngress = {
  ipProtocol: '6',
  cidrIp: '0.0.0.0/0',
  fromPort: 80,
  toPort: 80,
  groupId: securityGroup.attrGroupId
};

new ec2.CfnSecurityGroupIngress(
  this,
  'ingress-all-ipv4-tcp-http', compliantIngress);

const nonCompliantIngress2 = {
  ipProtocol: '-1',
  cidrIpv6: '::/0' // Noncompliant
};
new ec2.CfnSecurityGroupIngress(
  this,
  'ingress-all-ipv4-tcp-http', nonCompliantIngress2);
