import * as name from "module-name";   // Noncompliant {{Explicitly import the specific member needed.}}
import defaultMember, * as name from "module-name"; // Noncompliant [[sc=23;ec=24]]

export * from "module-name";  // Noncompliant

var x = 1 * 1;
