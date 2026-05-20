function wrap<T = string>(value: T): T {
  return value;
}

const value = wrap<string>('x');
