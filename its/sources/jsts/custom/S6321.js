import { aws_ec2 as ec2 } from 'aws-cdk-lib'

const instance = new ec2.Instance(this, "default-own-security-group",{
  instanceType: nanoT2,
  machineImage: ec2.MachineImage.latestAmazonLinux(),
  vpc: vpc,
  instanceName: "test-instance"
})
instance.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

// Code example for construct-only connections and IPv4
instance.connections.allowFrom(
  ec2.Peer.anyIpv4(), // Noncompliant
  ec2.Port.tcp(22),
  /*description*/ "Allows SSH from all IPv4"
)
instance.connections.allowFrom(
  ec2.Peer.ipv4("0.0.0.0/0"), // Noncompliant
  ec2.Port.tcpRange(/* startPort */ 1, /*endPort*/ 1024),
  /* description */ "Allows SSH and others from all IPv4"
)
instance.connections.allowFromAnyIpv4( // Noncompliant
  ec2.Port.tcp(3389),
  /* description */ "Allows Terminal Server from all IPv4"
)

instance.connections.allowFromAnyIpv4(  // Compliant
  ec2.Port.tcp(1234),
  /* description */ "Allows 1234 from all IPv4"
)

instance.connections.allowFrom(
  ec2.Peer.ipv4("192.0.2.0/24"), // Compliant
  ec2.Port.tcp(22),
  /* description */ "Allows SSH from all IPv4"
)

const connection = new ec2.Connections({
  defaultPort: ec2.Port.tcp(22),
  securityGroups: [securityGroup]
})

connection.allowDefaultPortFromAnyIpv4("Allows SSH from all IPv4") // Noncompliant
connection.allowDefaultPortFrom(ec2.Peer.anyIpv4(), "Allows SSH from all IPv4") // Noncompliant

const connection2 = new ec2.Connections({
  defaultPort:ec2.Port.tcp(1234),
  securityGroups:[securityGroup2]
})

connection2.allowDefaultPortFromAnyIpv4("Allows 1234 from all IPv4") // Compliant
connection2.allowDefaultPortFrom(ec2.Peer.anyIpv4(), "Allows 1234 from all IPv4") // Compliant


const securityGroup3 = new ec2.SecurityGroup(this, "custom-security-group", {
  vpc: vpc
})

securityGroup3.addIngressRule(
  ec2.Peer.anyIpv4(), // Noncompliant
  ec2.Port.tcpRange(1, 1024)
)

securityGroup3.addIngressRule(
  ec2.Peer.anyIpv4(),// Compliant, port is safe
  ec2.Port.tcpRange(1024, 1048)
)

new ec2.CfnSecurityGroup(
  this,
  "cfn-based-security-group", {
    groupDescription: "cfn based security group",
    groupName: "cfn-based-security-group",
    vpcId: vpc.vpcId,
    securityGroupIngress: [
      {
        ipProtocol: "6",
        cidrIp: "0.0.0.0/0", // Noncompliant
        fromPort: 22,
        toPort: 22
      },
      {
        ipProtocol: "tcp",
        cidrIp: "0.0.0.0/0", // Noncompliant
        fromPort: 3389,
        toPort: 3389
      },
      {
        ipProtocol: "-1",
        cidrIpv6: "::/0" // Noncompliant
      },
      {
        ipProtocol: "6",
        cidrIp: "192.0.2.0/24", // Compliant
        fromPort: 22,
        toPort: 22
      },
      {
        ipProtocol: "tcp",
        cidrIp: "0.0.0.0/0", // Compliant, port is safe
        fromPort: 1024,
        toPort: 1048
      }
    ]
  }
)

new ec2.CfnSecurityGroupIngress(
  this,
  "ingress-all-ip-tcp-ssh", {
    ipProtocol: "tcp",
    cidrIp: "0.0.0.0/0", // Noncompliant
    fromPort: 22,
    toPort: 22,
    groupId: securityGroup.attrGroupId
  })

new ec2.CfnSecurityGroupIngress(
  this,
  "ingress-all-ipv6-all-tcp", {
    ipProtocol: "-1",
    cidrIpv6: "::/0", // Noncompliant
    groupId: securityGroup.attrGroupId
  })

new ec2.CfnSecurityGroupIngress(
  this,
  "ingress-all-ipv4-tcp-http", {
    ipProtocol: "6",
    cidrIp: "0.0.0.0/0",
    fromPort: 80, // Compliant
    toPort: 80,
    groupId: securityGroup.attrGroupId
  })
