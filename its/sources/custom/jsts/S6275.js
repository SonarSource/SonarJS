import { Volume } from "aws-cdk-lib/aws-ec2";
import { Stack } from "aws-cdk-lib";

class NonCompliantStack extends Stack {
  constructor(scope, id) {
    super(scope, id);

    this.volume = new Volume(this, "Volume", { encrypted: false }); // Sensitive
  }
}
