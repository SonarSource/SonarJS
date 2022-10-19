import { CfnNotebookInstance } from "aws-cdk-lib/aws-sagemaker";
new CfnNotebookInstance(this, "CfnNotebookInstance", { kmsKeyId: undefined }); //Sensitive
