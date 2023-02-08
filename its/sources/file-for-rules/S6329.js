import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_rds as rds, RemovalPolicy } from "aws-cdk-lib";

export class CfnDatabaseInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "testvpc", {
      cidr: "10.0.0.0/16",
    });

    // A security group with allowed tcp/5432 for testing purposes
    const sg = new ec2.SecurityGroup(this, "PG allowed security group", {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: "database with ICMP allowed",
    });

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      /* description */ "Allow ICMP from internet"
    );

    const rdsSubnetGroupPublic = new rds.CfnDBSubnetGroup(
      this,
      "publicSubnet",
      {
        dbSubnetGroupDescription: "Subnets",
        dbSubnetGroupName: "publicSn",
        subnetIds: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PUBLIC,
        }).subnetIds,
      }
    );

    const rdsSubnetGroupPrivate = new rds.CfnDBSubnetGroup(
      this,
      "privateSubnet",
      {
        dbSubnetGroupDescription: "Subnets",
        dbSubnetGroupName: "privateSn",
        subnetIds: vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }).subnetIds,
      }
    );

    // Public db subnet
    var db = new rds.CfnDBInstance(this, "public-public-subnet", {
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPublic.ref,
      publiclyAccessible: true,
      vpcSecurityGroups: [sg.securityGroupId],
    });
    db.node.addDependency(vpc);

    // Private db subnet
    var db = new rds.CfnDBInstance(this, "public-private-subnet", {
      engine: "postgres",
      masterUsername: "foobar",
      masterUserPassword: "12345678",
      dbInstanceClass: "db.r5.large",
      allocatedStorage: "200",
      iops: 1000,
      dbSubnetGroupName: rdsSubnetGroupPrivate.ref, // False-Positive
      publiclyAccessible: true,
      vpcSecurityGroups: [sg.securityGroupId],
    });
    db.node.addDependency(vpc);
  }
}

export class CfnInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "default-vpc", { cidr: "10.10.10.0/24" });
    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new ec2.CfnInstance(this, "cfnPublicExposed", {
      instanceType: "t2.micro",
      imageId: "ami-0ea0f26a6d50850c5",
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true,
          deleteOnTermination: true,
          subnetId: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC })
            .subnetIds[0],
        },
      ],
    });
  }
}

export class DatabaseInstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "testvpc", {
      cidr: "10.0.0.0/16",
    });

    // A security group with allowed tcp/5432 for testing purposes
    const sg = new ec2.SecurityGroup(this, "PG allowed security group", {
      vpc: vpc,
      allowAllOutbound: true,
      securityGroupName: "database with ICMP allowed",
    });

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      /* description */ "Allow ICMP from internet"
    );

    new rds.DatabaseInstance(this, "public_default_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc, // False-Positive
      publiclyAccessible: true, // Compliant
      securityGroups: [sg],
    });

    new rds.DatabaseInstance(this, "public_public_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      publiclyAccessible: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [sg],
    });

    new rds.DatabaseInstance(this, "default_public_subnet", {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [sg],
    });
  }
}

export class InstanceStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "default-vpc", { cidr: "10.10.10.0/24" });
    vpc.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const nanoT2 = ec2.InstanceType.of(
      ec2.InstanceClass.T2,
      ec2.InstanceSize.NANO
    );
    const instance = new ec2.Instance(this, "vpcSubnetPublic", {
      instanceType: nanoT2,
      machineImage: ec2.MachineImage.latestAmazonLinux(),
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });
    instance.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
