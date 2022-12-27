import { Volume } from "aws-cdk-lib/aws-ec2";
import { Stack, Size } from "aws-cdk-lib";

class NonCompliantStack extends Stack {
  constructor(scope, id) {
    super(scope, id);

    new Volume(this, "Volume", { encrypted: false }); // Noncompliant {{Make sure that using unencrypted volumes is safe here.}}
    //                                      ^^^^^

    new Volume(this, "Volume", { ["encrypted"]: false }); // Noncompliant {{Make sure that using unencrypted volumes is safe here.}}
    //                                          ^^^^^

    new Volume(this, "Volume", { encrypted: null }); // Compliant (null are ignored)

    new Volume(this, "Volume", { encrypted: undefined }); // Noncompliant {{Omitting "encrypted" disables volumes encryption. Make sure it is safe here.}}
    //                                      ^^^^^^^^^

    new Volume(this, "Volume"); // Noncompliant {{Omitting "encrypted" disables volumes encryption. Make sure it is safe here.}}
//      ^^^^^^

    new Volume(this, "Volume", undefined); // Noncompliant {{Omitting "encrypted" disables volumes encryption. Make sure it is safe here.}}
//      ^^^^^^

    new Volume(this, "Volume", {}); // Noncompliant {{Omitting "encrypted" disables volumes encryption. Make sure it is safe here.}}
//                             ^^

    const encrypted1 = false;
    new Volume(this, "Volume", { encrypted: encrypted1 }); // Noncompliant {{Make sure that using unencrypted volumes is safe here.}}
//                                          ^^^^^^^^^^

    const encrypted2 = null;
    new Volume(this, "Volume", { encrypted: encrypted2 }); // Compliance (null are ignored)

    const encrypted3 = undefined;
    new Volume(this, "Volume", { encrypted: encrypted3 }); // Noncompliant {{Omitting "encrypted" disables volumes encryption. Make sure it is safe here.}}
//                                          ^^^^^^^^^^

    const encrypted = false;
    new Volume(this, "Volume", { encrypted });  // Noncompliant {{Make sure that using unencrypted volumes is safe here.}}
//                               ^^^^^^^^^

    new Volume(this, "unencrypted-explicit", {
      availability_zone: "eu-west-1a",
      size: Size.gibibytes(1),
      encrypted: false, // Noncompliant
//               ^^^^^
    });

    const volumeArgs = {encrypted: false};
    new Volume(this, "Volume", {...volumeArgs}); // Noncompliant {{Make sure that using unencrypted volumes is safe here.}}
//                             ^^^^^^^^^^^^^^^

    const args = [this, "Volume", { encrypted: false }];
    new Volume(...args); // FN
  }
}

class CompliantStack extends Stack {
  constructor(scope, id) {
    super(scope, id);
    new Volume(this, "Volume", { encrypted: true });
    new Volume(this, "Volume", { encrypted: unknown });
    new Volume(this, "Volume", { encrypted: null });
    const encrypted1 = true;
    new Volume(this, "Volume", { encrypted: encrypted1 });
    const encrypted = true;
    new Volume(this, "Volume", { encrypted });
    const volumeArgs = {encrypted: true};
    new Volume(this, "Volume", {...volumeArgs});
    new Volume(this, "Volume", unknown);
  }
}
