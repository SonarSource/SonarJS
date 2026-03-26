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
foo`${[1, 2, 3]}`; // Noncompliant {{The signature '(strings: TemplateStringsArray, ...values: any[]): string' of 'foo' is deprecated.}}

/* separator */

interface X {
    /** @deprecated use bar instead*/
    foo(pp: string): number;
}
function bar(x: X, p: string) {
    x.foo(p); // Noncompliant {{The signature '(pp: string): number' of 'x.foo' is deprecated.}}
//    ^^^
}

/* separator */

export class A {
    m(e: KeyboardEvent) {
        return e.which; // Noncompliant {{'which' is deprecated.}}
    }
}

/* separator */

declare interface D {
    /** @deprecated */ m: () => void;
}
declare let d: D;
d.m(); // Noncompliant {{'m' is deprecated.}}

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

let myObj = new MyClass(); // Noncompliant {{'MyClass' is deprecated.}}
let fromDeprecatedProp = myObj.deprecatedProperty; // Noncompliant {{'deprecatedProperty' is deprecated.}}
foo(myObj.oneMoreDeprecated); // Noncompliant {{'oneMoreDeprecated' is deprecated.}}
foo(fromDeprecatedProp);
foo(myObj.notDeprecated);

interface MyInterface extends MyClass {} // Noncompliant {{'MyClass' is deprecated.}}
let myInterface: MyInterface;
foo(myInterface.deprecatedProperty); // Noncompliant {{'deprecatedProperty' is deprecated.}}
foo(myInterface.notDeprecated); 

(function ({deprecatedProperty, notDeprecated, oneMoreDeprecated: tmp}: MyInterface) {})  // Noncompliant {{'deprecatedProperty' is deprecated.}} {{'oneMoreDeprecated' is deprecated.}}
(function ({foo: {deprecatedProperty, notDeprecated}}: {foo: MyInterface}) {}) // Noncompliant {{'deprecatedProperty' is deprecated.}}

let {deprecatedProperty, notDeprecated, oneMoreDeprecated} = myObj; // Noncompliant  {{'deprecatedProperty' is deprecated.}} {{'oneMoreDeprecated' is deprecated.}}
({deprecatedProperty, notDeprecated, oneMoreDeprecated} = myObj); // Noncompliant  {{'deprecatedProperty' is deprecated.}} {{'oneMoreDeprecated' is deprecated.}}

({deprecatedProperty: notDeprecated, notDeprecated: oneMoreDeprecated, oneMoreDeprecated: deprecatedProperty} = myObj); // Noncompliant  {{'deprecatedProperty' is deprecated.}} {{'oneMoreDeprecated' is deprecated.}}
let obj = { deprecatedProperty: 42, notDeprecated };

/** @deprecated */
let deprecatedVar; 
({deprecatedProperty: deprecatedVar} = myObj);  // Noncompliant  {{'deprecatedProperty' is deprecated.}} {{'deprecatedVar' is deprecated.}}

/* separator */

/** @deprecated */
const const1 = 1,
    const2 = 2;

h(const1 + const2); // Noncompliant  {{'const1' is deprecated.}} {{'const2' is deprecated.}}
export default const1;// Noncompliant {{'const1' is deprecated.}}

/* separator */

function fn<T>(): T;
/** @deprecated */
function fn(bar: any): any;
function fn() { }

fn<number>();
fn(1); // Noncompliant {{The signature '(bar: any): any' of 'fn' is deprecated.}}
h(fn);

/* separator */

class MyClass1 {
/** @deprecated */
static method(): void;
static method(param): void;
static method(param?): void {}
}

new MyClass1();
MyClass1.method(); // Noncompliant {{The signature '(): void' of 'MyClass1.method' is deprecated.}}
MyClass1.method(1);

/* separator */

interface MyInterface1 {
/** @deprecated */
method(): void;
method(param): void;
}
let myInterface1: MyInterface1;
myInterface1.method(); // Noncompliant {{The signature '(): void' of 'myInterface1.method' is deprecated.}}
myInterface1.method(1);

/* separator */

let callSignature: {
    /** @deprecated */
    (): void;
    (param): void;
}
callSignature(); // Noncompliant {{The signature '(): void' of 'callSignature' is deprecated.}}
callSignature(42);

/** @deprecated */
let deprecatedCallSignature: {
    (): void;
}
deprecatedCallSignature(); // Noncompliant {{'deprecatedCallSignature' is deprecated.}}

/** @deprecated */
let deprecatedCallSignature2: () => void;
deprecatedCallSignature2(); // Noncompliant {{'deprecatedCallSignature2' is deprecated.}}

/* separator */

import * as allDeprecations from './cb.fixture.deprecations';
z(allDeprecations.deprecatedFunction);

import defaultImport, {deprecatedFunction, anotherDeprecatedFunction as aliasForDeprecated, notDeprecated1, notDeprecated2} from './cb.fixture.deprecations'; // Noncompliant  {{'anotherDeprecatedFunction' is deprecated.}} {{'notDeprecated1' is deprecated.}}
defaultImport(); // Noncompliant {{'defaultImport' is deprecated.}}
deprecatedFunction(); // Noncompliant {{The signature '(): void' of 'deprecatedFunction' is deprecated.}}
deprecatedFunction(1);
aliasForDeprecated(); // Noncompliant {{'aliasForDeprecated' is deprecated.}}
noDeprecated1(); // OK
noDeprecated2(); // OK

import * as deprecationsExport from './cb.fixture.deprecationsExport';
z(deprecationsExport); // Noncompliant {{'deprecationsExport' is deprecated.}}

import {DeprecatedClass, ClassWithDeprecatedConstructor, ClassWithOneDeprecatedConstructor} from "./cb.fixture.deprecations" // Noncompliant {{'DeprecatedClass' is deprecated.}}
const myObj2: DeprecatedClass = new DeprecatedClass();  // Noncompliant  {{'DeprecatedClass' is deprecated.}} {{'DeprecatedClass' is deprecated.}}
const myObj3: DeprecatedConstructorClass = new ClassWithDeprecatedConstructor(); // Noncompliant {{The signature '(): ClassWithDeprecatedConstructor' of 'ClassWithDeprecatedConstructor' is deprecated.}}
new ClassWithOneDeprecatedConstructor();
new ClassWithOneDeprecatedConstructor(1); // Noncompliant {{The signature '(p: number): ClassWithOneDeprecatedConstructor' of 'ClassWithOneDeprecatedConstructor' is deprecated.}}

/* i4008 */

/** @deprecated */ function someDeprecated(a: string): string;
/** @param a */ function someDeprecated(a: number): number;
function someDeprecated(a: number | string): number | string {
    if (typeof a === 'number') return a + 1;
    return a;
}

someDeprecated('yolo'); // Noncompliant {{The signature '(a: string): string' of 'someDeprecated' is deprecated.}}
someDeprecated(42); // OK
someDeprecated; // OK

/** @deprecated */ function allDeprecated(a: string): string;
/** @deprecated */ function allDeprecated(a: number): number;
function allDeprecated(a: number | string): number | string {
    if (typeof a === 'number') return a + 1;
    return a;
}

allDeprecated('yolo'); // Noncompliant {{The signature '(a: string): string' of 'allDeprecated' is deprecated.}}
allDeprecated(42); // Noncompliant {{The signature '(a: number): number' of 'allDeprecated' is deprecated.}}
allDeprecated; // OK
