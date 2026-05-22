declare class Builder {
  new(): string;
}

interface Shape {
  new (): number;
}

type Factory = {
  new (): Shape;
};
