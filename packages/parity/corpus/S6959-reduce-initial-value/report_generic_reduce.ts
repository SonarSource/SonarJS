function sum<T extends number[]>(values: T) {
  return values.reduce((total, value) => total + value);
}
