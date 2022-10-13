import { Volume } from "aws-cdk-lib/aws-ec2";
import { Stack, Size } from "aws-cdk-lib";

class NonCompliantStack extends Stack {
  constructor(scope, id) {
    super(scope, id);

    new Volume(this, "Volume", { encrypted: false }); // Noncompliant {{Make sure that using unencrypted volumes is safe here.}}
    //                           ^^^^^^^^^^^^^^^^

    new Volume(this, "Volume", {}); // Noncompliant {{Omitting "encrypted" disables volumes encryption. Make sure it is safe here.}}
    //                         ^^

    new Volume(this, "unencrypted-explicit", {
      availability_zone: "eu-west-1a",
      size: Size.gibibytes(1),
      encrypted: false, // Noncompliant
    });

    const volumeArgs = {encrypted: false};
    new Volume(this, "Volume", {...volumeArgs}); // FN
  }
}

class CompliantStack extends Stack {
  constructor(scope, id) {
    super(scope, id);
    new Volume(this, "Volume", { encrypted: true });
    new Volume(this, "Volume", { encrypted: unknown });
    const encrypted = true;
    new Volume(this, "Volume", { encrypted: encrypted });
    const volumeArgs = {encrypted: true};
    new Volume(this, "Volume", {...volumeArgs});
  }
}
