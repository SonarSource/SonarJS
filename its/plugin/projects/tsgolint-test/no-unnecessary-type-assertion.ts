// S4325: no-unnecessary-type-assertion — type assertion is not needed
const str: string = 'hello';
const unnecessary = str as string; // Noncompliant
