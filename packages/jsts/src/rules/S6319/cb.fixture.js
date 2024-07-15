import { CfnNotebookInstance } from 'aws-cdk-lib/aws-sagemaker';

new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: 'kmsKeyId' }); // Compliant
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: null }); // Compliant (null are ignored)

new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: undefined }); // Noncompliant {{Omitting "kmsKeyId" disables encryption of SageMaker notebook instances. Make sure it is safe here.}}
//                                                               ^^^^^^^^^

new CfnNotebookInstance(this, "CfnNotebookInstance"); // Noncompliant {{Omitting "kmsKeyId" disables encryption of SageMaker notebook instances. Make sure it is safe here.}}
//  ^^^^^^^^^^^^^^^^^^^

new CfnNotebookInstance(this, "CfnNotebookInstance", {}); // Noncompliant {{Omitting "kmsKeyId" disables encryption of SageMaker notebook instances. Make sure it is safe here.}}
//                                                   ^^

new CfnNotebookInstance(this, "CfnNotebookInstance", unknownValue); // Compliant
new CfnNotebookInstance(this, "CfnNotebookInstance", { ...unknownValue }); // Compliant
new CfnNotebookInstance(this, "CfnNotebookInstance", { ...unknownValue, kmsKeyId: undefined }); // Noncompliant
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: undefined , ...unknownValue }); // Noncompliant
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: unknownValue }); // Compliant

const value1 = false;
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: value1 }); // Compliant (false is ignored)

const value2 = null;
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: value2 }); // Compliance (null are ignored)
const value3 = undefined;
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: value3 }); // Noncompliant {{Omitting "kmsKeyId" disables encryption of SageMaker notebook instances. Make sure it is safe here.}}
//                                                               ^^^^^^

const args = [this, "CfnNotebookInstance", { kmsKeyId: undefined }];
new CfnNotebookInstance(...args); // FN (we ignore spreadoperator)
