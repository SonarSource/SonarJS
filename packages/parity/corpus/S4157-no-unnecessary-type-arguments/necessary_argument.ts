function wrap<T = string>(value: T): T {
  return value;
}

const value = wrap<number>(42);
