import { FileSystem } from 'aws-cdk-lib/aws-efs';

new FileSystem(this, 'unencrypted-explicit', {vpc: new Vpc(this, 'VPC')});

new FileSystem(this, 'unencrypted-explicit', {
  vpc: new Vpc(this, 'VPC'),
  encrypted: false //Noncompliant  {{Make sure that using unencrypted file systems is safe here.}}
//           ^^^^^
});

const { CfnFileSystem } = require('aws-cdk-lib').aws_efs;

new CfnFileSystem(this, 'unencrypted-explicit-cfn', {encrypted: false}); //Noncompliant {{Make sure that using unencrypted file systems is safe here.}}
//                                                              ^^^^^

new CfnFileSystem(this, 'unencrypted-explicit-cfn', {'encrypted': false}); //Noncompliant {{Make sure that using unencrypted file systems is safe here.}}
//                                                                ^^^^^

new CfnFileSystem(this, 'unencrypted-explicit-cfn', {'encrypted': undefined}); //Noncompliant {{Omitting "encrypted" disables EFS encryption. Make sure it is safe here.}}
//                                                                ^^^^^^^^^

new CfnFileSystem(this, 'unencrypted-explicit-cfn', {enableAutomaticBackups: true}); //Noncompliant {{Omitting "encrypted" disables EFS encryption. Make sure it is safe here.}}
//                                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    new CfnFileSystem(this, 'unencrypted-implicit-cfn'); // Noncompliant  {{Omitting "encrypted" disables EFS encryption. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

const encrypted1 = false;
const encrypted2 = null;
const encrypted3 = undefined;

new CfnFileSystem(this, 'unencrypted-explicit-cfn', {encrypted: encrypted1}); //Noncompliant {{Make sure that using unencrypted file systems is safe here.}}
//                                                              ^^^^^^^^^^
new CfnFileSystem(this, 'unencrypted-explicit-cfn', {encrypted: encrypted2}); //Noncompliant {{Make sure that using unencrypted file systems is safe here.}}
//                                                              ^^^^^^^^^^
new CfnFileSystem(this, 'unencrypted-explicit-cfn', {encrypted: encrypted3}); //Noncompliant {{Omitting "encrypted" disables EFS encryption. Make sure it is safe here.}}
//                                                              ^^^^^^^^^^

const opts = {encrypted: false};//Noncompliant {{Make sure that using unencrypted file systems is safe here.}}
//                       ^^^^^
new CfnFileSystem(this, 'unencrypted-explicit-cfn', {...opts});

const args = [];
new CfnFileSystem(...args); //Compliant (ignored spreadOperator on arguments)
