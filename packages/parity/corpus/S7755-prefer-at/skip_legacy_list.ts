interface LegacyList<T> {
  length: number;
  [index: number]: T;
}

declare const items: LegacyList<string>;
const last = items[items.length - 1];
