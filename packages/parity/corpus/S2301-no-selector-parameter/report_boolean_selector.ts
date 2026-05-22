declare function offerLiquor(name: string): void;
declare function offerCandy(name: string): void;

function tempt(name: string, ofAge: boolean) {
  if (ofAge) {
    offerLiquor(name);
  } else {
    offerCandy(name);
  }
}

void tempt;
