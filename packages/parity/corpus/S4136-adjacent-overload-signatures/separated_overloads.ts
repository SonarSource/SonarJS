class Factory {
  static create(value: string): Factory;
  field = 1;
  static create(value: number): Factory;
  static create(value: string | number): Factory {
    return new Factory();
  }
}
