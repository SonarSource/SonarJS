export {};

function sameOrder(a: string[], b: string[]) {
  return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
}

void sameOrder;
