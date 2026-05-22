function compare(a: number, b: number) {
  return a - b;
}

const reversed = (a: number, b: number) => compare(b, a);

void reversed;
