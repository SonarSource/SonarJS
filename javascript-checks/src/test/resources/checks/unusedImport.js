// @flow

import type {UserID, //Noncompliant {{Remove this unused import of 'UserID'.}}
    User} from "MyTypes"; // Noncompliant {{Remove this unused import of 'User'.}}

import A from 'a';      // Noncompliant {{Remove this unused import of 'A'.}}
import { B1 } from 'b';

console.log("My first JavaScript...");

import { B1 } from 'b'; // Noncompliant {{'B1' is already imported; remove this redundant import.}}

console.log(B1);

import * as test from 'starimport'; // Noncompliant

import { Exported } from 'b';  // used in export

export {
    Exported
}

import typeof myNumber from './exports'; // Noncompliant

import {a as b} from 'mymodule'; // Noncompliant
import {a as c} from 'mymodule';

console.log(c);

import * as usedStarImport from 'usedstarimport';
var x: usedStarImport.foo = 42;
