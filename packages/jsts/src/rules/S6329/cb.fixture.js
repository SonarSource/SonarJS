import * as cdk from 'aws-cdk-lib';
import { aws_dms as dms, aws_ec2 as ec2, aws_rds as rds, RemovalPolicy } from 'aws-cdk-lib';

export class CfnDatabaseInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "testvpc", {
      cidr: "10.0.0.0/16"
    })

    // A security group with allowed tcp/5432 for testing purposes
    const sg = new ec2.SecurityGroup(this, "PG allowed security group", {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: "database with ICMP allowed"
    })

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      /* description */ "Allow ICMP from internet"
    )

    const rdsSubnetGroupPublic = new rds.CfnDBSubnetGroup(this, "publicSubnet", {
      dbSubnetGroupDescription: "Subnets",
      dbSubnetGroupName: "publicSn",
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC
      }).subnetIds
    })

    const rdsSubnetGroupPrivate = new rds.CfnDBSubnetGroup(this, "privateSubnet", {
      dbSubnetGroupDescription: "Subnets",
      dbSubnetGroupName: "privateSn",
      subnetIds: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }).subnetIds
    })

    // Public db subnet
    var db = new rds.CfnDBInstance(this, "public-public-subnet", {
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPublic.ref,
      publiclyAccessible: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                        ^^^^
      vpcSecurityGroups: [sg.securityGroupId]
    })
    db.node.addDependency(vpc)

    var db = new rds.CfnDBInstance(this, "private-public-subnet", {
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPublic.ref,
      publiclyAccessible: false, // Compliant
      vpcSecurityGroups: [sg.securityGroupId]
    })
    db.node.addDependency(vpc)

    var db = new rds.CfnDBInstance(this, "default-public-subnet", { // Compliant
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPublic.ref,
      vpcSecurityGroups: [sg.securityGroupId]
    })
    db.node.addDependency(vpc)

    // Private db subnet
    var db = new rds.CfnDBInstance(this, "public-private-subnet", {
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPrivate.ref, // False-Positive
      publiclyAccessible: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                        ^^^^
      vpcSecurityGroups: [sg.securityGroupId]
    })
    db.node.addDependency(vpc)

    var db = new rds.CfnDBInstance(this, "private-private-subnet", {
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPrivate.ref,
      publiclyAccessible: false, // Compliant
      vpcSecurityGroups: [sg.securityGroupId]
    })
    db.node.addDependency(vpc)

    var db = new rds.CfnDBInstance(this, "default-private-subnet", { // Compliant
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPrivate.ref,
      vpcSecurityGroups: [sg.securityGroupId]
    })
    db.node.addDependency(vpc)
  }
}

export class CfnInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "default-vpc", {cidr: "10.10.10.0/24"})
    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY)

    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^
          deleteOnTermination: true,
          subnetId: vpc.selectSubnets({subnetType: ec2.SubnetType.PUBLIC}).subnetIds[0]
        }
      ]
    })

    const subnets = vpc.selectSubnets({subnetType: ec2.SubnetType.PUBLIC});
    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^
          deleteOnTermination: true,
          subnetId: subnets.subnetIds[0]
        }
      ]
    })

    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^
          deleteOnTermination: true,
          subnetId
        }
      ]
    })

    const subnetId = subnets.subnetIds[0];
    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^
          deleteOnTermination: true,
          subnetId
        }
      ]
    })

    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^
          deleteOnTermination: true,
          subnetId: undefined
        }
      ]
    })

    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^
          deleteOnTermination: true,
          subnetId: foo()
        }
      ]
    })

    new ec2.CfnInstance(this, "cfnPrivateWithPublicIp", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: null // Compliant
    })

    new ec2.CfnInstance(this, "cfnPrivateWithPublicIp", { // Compliant
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
    })

    new ec2.CfnInstance(this, "cfnPrivateWithPublicIp", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true, // Compliant, the public IP won't be routable
          deleteOnTermination: true,
          subnetId: vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS}).subnetIds[0]
        }
      ]
    })

    new ec2.CfnInstance(this, "cfnPrivate", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: false, // Compliant
          deleteOnTermination: true,
          subnetId: vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS}).subnetIds[0]
        }
      ]
    })

  }
}

export class DatabaseInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "testvpc", {
      cidr: "10.0.0.0/16"
    })

    // A security group with allowed tcp/5432 for testing purposes
    const sg = new ec2.SecurityGroup(this, "PG allowed security group", {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: "database with ICMP allowed"
    })

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      /* description */ "Allow ICMP from internet"
    )

    new rds.DatabaseInstance(this, "public_default_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc, // False-Positive
      publiclyAccessible: true, // Compliant
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "private_default_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      publiclyAccessible: false, // Compliant
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "public_public_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      publiclyAccessible: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                        ^^^^
      vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "public_private_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      publiclyAccessible: true, // Compliant, IP won't be routable
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "private_public_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      publiclyAccessible: false, // Compliant
      vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC},
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "private_private_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      publiclyAccessible: false, // Compliant
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "default_private_subnet", { // Compliant
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS},
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "default_public_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC}, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                             ^^^^^^^^^^^^^^^^^^^^^
      securityGroups: [sg]
    })

    const vpcSubnets = {subnetType: ec2.SubnetType.PUBLIC}; // Noncompliant {{Make sure allowing public network access is safe here.}}
//                                  ^^^^^^^^^^^^^^^^^^^^^
    new rds.DatabaseInstance(this, "default_public_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      vpcSubnets,
      securityGroups: [sg]
    })

    new rds.DatabaseInstance(this, "default_default_subnet", { // Compliant
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      securityGroups: [sg]
    })
  }
}

export class InstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "default-vpc", {cidr: "10.10.10.0/24"})
    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY)

    const nanoT2 = ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.NANO)
    const instance = new ec2.Instance(this, "vpcSubnetPublic", {
      instanceType: nanoT2,
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      vpc: vpc,
      vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC} // Noncompliant {{Make sure allowing public network access is safe here.}}
//                             ^^^^^^^^^^^^^^^^^^^^^
    })
    instance.applyRemovalPolicy(RemovalPolicy.DESTROY)

    const privateInstance = new ec2.Instance(
      this,
      "vpcSubnetPrivate", {
        instanceType: nanoT2,
        machineImage: ec2.MachineImage.latestAmazonLinux(),
        vpc: vpc,
        vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS} // Compliant
      })
    privateInstance.applyRemovalPolicy(RemovalPolicy.DESTROY)

    const defaultPrivateInstance = new ec2.Instance( // Compliant, private by default
      this,
      "vpcSubnetPrivateDefault", {
        instanceType: nanoT2,
        machineImage: ec2.MachineImage.latestAmazonLinux(),
        vpc: vpc
      })
    defaultPrivateInstance.applyRemovalPolicy(RemovalPolicy.DESTROY)
  }
}

export class CfnReplicationInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "testvpc", {
      cidr: "10.0.0.0/16"
    })

    const subnetGroup = new dms.CfnReplicationSubnetGroup(
      this, "default-subnet", {
        replicationSubnetGroupDescription: "default subnet group",
        replicationSubnetGroupIdentifier: "default-subnet",
        subnetIds: vpc.selectSubnets().subnetIds
      })
    subnetGroup.node.addDependency(vpc)

    var repInstance = new dms.CfnReplicationInstance(
      this, "explicitPublic", {
        replicationInstanceClass: "dms.t2.micro",
        allocatedStorage: 5,
        publiclyAccessible: true, // Noncompliant {{Make sure allowing public network access is safe here.}}
//                          ^^^^
        replicationSubnetGroupIdentifier: subnetGroup.replicationSubnetGroupIdentifier,
        vpcSecurityGroupIds: [vpc.vpcDefaultSecurityGroup]
      })
    repInstance.node.addDependency(subnetGroup)

    var repInstance = new dms.CfnReplicationInstance(
      this, "explicitPrivate", {
        replicationInstanceClass: "dms.t2.micro",
        allocatedStorage: 5,
        publiclyAccessible: false, // Compliant
        replicationSubnetGroupIdentifier: subnetGroup.replicationSubnetGroupIdentifier,
        vpcSecurityGroupIds: [vpc.vpcDefaultSecurityGroup]
      })
    repInstance.node.addDependency(subnetGroup)

    var repInstance = new dms.CfnReplicationInstance(this, "defaultPublic", { // Noncompliant {{Make sure allowing public network access is safe here.}}
        replicationInstanceClass: "dms.t2.micro",
        allocatedStorage: 5,
        replicationSubnetGroupIdentifier: subnetGroup.replicationSubnetGroupIdentifier,
        vpcSecurityGroupIds: [vpc.vpcDefaultSecurityGroup]
      })
    repInstance.node.addDependency(subnetGroup)
  }
}
