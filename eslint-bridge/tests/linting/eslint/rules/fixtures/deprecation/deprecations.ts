/** @deprecated */
export function deprecatedFunction(): void;
export function deprecatedFunction(num: number);
export function deprecatedFunction(_num?: number) {}

/** @deprecated */
export let anotherDeprecatedFunction: Function;

/** When @deprecated is in the jsdoc text */
export let notDeprecated1: Function;
/* @deprecated not JsDoc */
export let notDeprecated2: Function;

/** @deprecated */
let defaultExport;
export default defaultExport;

/** @deprecated */
export class DeprecatedClass {
  constructor() {}
}

export class ClassWithDeprecatedConstructor {
  /** @deprecated */
  constructor() {}
}

export class ClassWithOneDeprecatedConstructor {
  constructor();
  /** @deprecated */
  constructor(p: number);
  constructor(p?: number) {}
}
