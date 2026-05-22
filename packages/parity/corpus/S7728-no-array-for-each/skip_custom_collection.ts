interface CustomCollection {
  forEach(callback: (value: string) => void): void;
}

declare const collection: CustomCollection;
collection.forEach(value => console.log(value));
