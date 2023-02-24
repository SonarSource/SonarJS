function factorial(n: number): number {
  if (n < 2) {
    return 1;
  }
  return n * factorial(n - 1);
}
