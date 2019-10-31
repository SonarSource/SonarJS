class MyClass {
  private x: string;
  private _y = "hello";
  private z = 0;

  constructor(private w: number, readonly ro: number) {

  }

  public setX(x: number) { // Noncompliant
  }

  public GetX(): string { // Noncompliant
    return this._y;
  }

  public get y(): number { // Noncompliant
    return this.z;
  }

  public set y(y: number) { // Noncompliant
  }

  public getY(): string { // OK
    return this._y;
  }

  public SetZ(z: number) { // OK
    this.z = z;
  }

  public setW(x: string) { // Noncompliant
    this.x = x;
  }

  public setRO(ro: number) { // OK
    const twoStatementBody = 1;
    this.z = ro;
  }
}
