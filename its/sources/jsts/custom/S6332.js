import { FileSystem, CfnFileSystem } from 'aws-cdk-lib/aws-efs';

new FileSystem(this, 'unencrypted-explicit', {encrypted: false})
new CfnFileSystem(this, 'unencrypted-explicit-cfn', {encrypted: false});
