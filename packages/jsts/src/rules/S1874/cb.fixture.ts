function foo(strings: TemplateStringsArray, ...values: string[]): string;
function foo(strings: TemplateStringsArray, ...values: number[]): string;
/** @deprecated */
function foo(strings: TemplateStringsArray, ...values: any[]): string;
function foo(strings: TemplateStringsArray, ...values: any[]): string {
    return "result";
}

foo``;
foo`${'foo'}`;
foo`${42}`;
foo`${[1, 2, 3]}`; // Noncompliant FN

/* separator */

interface X {
    /** @deprecated use bar instead*/
    foo(pp: string): number;
}
function bar(x: X, p: string) {
    x.foo(p); // Noncompliant {{'foo' is deprecated. use bar instead}}
//    ^^^
}

/* separator */

export class A {
    m(e: KeyboardEvent) {
        return e.which; // Noncompliant
    }
}

/* separator */

declare interface D {
    /** @deprecated */ m: () => void;
}
declare let d: D;
d.m(); // Noncompliant

/* separator */

/**
 * @someTag
 * @deprecated since version 42
 */
export class MyClass {
    /** @deprecated */
    deprecatedProperty: any;
    /** @deprecated with message */ oneMoreDeprecated: any;
    notDeprecated;
}

let myObj = new MyClass(); // Noncompliant
let fromDeprecatedProp = myObj.deprecatedProperty; // Noncompliant
foo(myObj.oneMoreDeprecated); // Noncompliant
foo(fromDeprecatedProp);
foo(myObj.notDeprecated);

interface MyInterface extends MyClass {} // Noncompliant
let myInterface: MyInterface;
foo(myInterface.deprecatedProperty); // Noncompliant
foo(myInterface.notDeprecated);

(function ({deprecatedProperty, notDeprecated, oneMoreDeprecated: tmp}: MyInterface) {})  // Noncompliant 2
(function ({foo: {deprecatedProperty, notDeprecated}}: {foo: MyInterface}) {}) // Noncompliant

let {deprecatedProperty, notDeprecated, oneMoreDeprecated} = myObj; // Noncompliant 2
({deprecatedProperty, notDeprecated, oneMoreDeprecated} = myObj); // Noncompliant 2

({deprecatedProperty: notDeprecated, notDeprecated: oneMoreDeprecated, oneMoreDeprecated: deprecatedProperty} = myObj); // Noncompliant 2
let obj = { deprecatedProperty: 42, notDeprecated };

/** @deprecated */
let deprecatedVar;
({deprecatedProperty: deprecatedVar} = myObj);  // Noncompliant 2

/* separator */

/** @deprecated */
const const1 = 1,
    const2 = 2;

h(const1 + const2); // Noncompliant
export default const1;// Noncompliant

/* separator */

function fn<T>(): T;
/** @deprecated */
function fn(bar: any): any;
function fn() { }

fn<number>();
fn(1); // Noncompliant
h(fn); // OK, not deprecated anymore because it has non-deprecated declarations

/* separator */

class MyClass1 {
/** @deprecated */
static method(): void;
static method(param): void;
static method(param?): void {}
}

new MyClass1();
MyClass1.method(); // Noncompliant
MyClass1.method(1);

/* separator */

interface MyInterface1 {
/** @deprecated */
method(): void;
method(param): void;
}
let myInterface1: MyInterface1;
myInterface1.method(); // Noncompliant
myInterface1.method(1);

/* separator */

let callSignature: {
    /** @deprecated */
    (): void;
    (param): void;
}
callSignature(); // Noncompliant
callSignature(42);

/** @deprecated */
let deprecatedCallSignature: {
    (): void;
}
deprecatedCallSignature(); // Noncompliant

/** @deprecated */
let deprecatedCallSignature2: () => void;
deprecatedCallSignature2(); // Noncompliant

/* separator */

import * as allDeprecations from './cb.fixture.deprecations';
z(allDeprecations.deprecatedFunction); // OK, not deprecated anymore because it has non-deprecated declarations

import defaultImport, {deprecatedFunction, anotherDeprecatedFunction as aliasForDeprecated, notDeprecated1, notDeprecated2} from './cb.fixture.deprecations';
defaultImport(); // Noncompliant
deprecatedFunction(); // Noncompliant
deprecatedFunction(1);
aliasForDeprecated(); // Noncompliant
noDeprecated1(); // OK
noDeprecated2(); // OK

import * as deprecationsExport from './cb.fixture.deprecationsExport';
z(deprecationsExport); // Noncompliant

import {DeprecatedClass, ClassWithDeprecatedConstructor, ClassWithOneDeprecatedConstructor} from "./cb.fixture.deprecations"
const myObj2: DeprecatedClass = new DeprecatedClass();  // Noncompliant 2
const myObj3: DeprecatedConstructorClass = new ClassWithDeprecatedConstructor(); // Noncompliant
new ClassWithOneDeprecatedConstructor();
new ClassWithOneDeprecatedConstructor(1); // Noncompliant

// fixes issue #4008

/** @deprecated */ function someDeprecated(a: string): string;
/** @param a */ function someDeprecated(a: number): number;
function someDeprecated(a: number | string): number | string {
    if (typeof a === 'number') return a + 1;
    return a;
}

someDeprecated('yolo'); // Noncompliant
someDeprecated(42); // OK
someDeprecated: // OK

/** @deprecated */ function allDeprecated(a: string): string;
/** @deprecated */ function allDeprecated(a: number): number;
function allDeprecated(a: number | string): number | string {
    if (typeof a === 'number') return a + 1;
    return a;
}

allDeprecated('yolo'); // Noncompliant
allDeprecated(42); // Noncompliant
allDeprecated; // Noncompliant

function multipleDeclarationsWithoutJsDoc(a: string): void;
function multipleDeclarationsWithoutJsDoc(a: number): void;
function multipleDeclarationsWithoutJsDoc(a: string | number): void {
    a;
}
multipleDeclarationsWithoutJsDoc;

/** hello */ function multipleDeclarationsWithoutTags(a: string): void;
/** I have no tags */function multipleDeclarationsWithoutTags(a: number): void;
/** me neither */ function multipleDeclarationsWithoutTags(a: string | number): void {
    a;
}
multipleDeclarationsWithoutTags;

