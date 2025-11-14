import fs from 'node:fs/promises';
import pug from 'pug';
import { compile } from 'pug';
import * as pugModule from 'pug';

// Test case 1: Variable template from file system (should trigger)
const template = await fs.readFile('views/userProfile.pug', { encoding: 'utf-8' })
const fn = pug.compile(template) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//             ^^^^^^^
fn("data")

// Test case 2: Static string templates (compliant)
const staticFn = pug.compile('h1 Hello World') // Compliant - static string
const staticFn2 = pug.compile("div.container p Welcome") // Compliant - static string
const staticFn3 = pug.compile(`div
  h1 Static Template
  p This is safe`) // Compliant - template literal without expressions

// Test case 3: Dynamic templates with variables (should trigger)
const userInput = getUserInput();
const dynamicFn = pug.compile(userInput) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                    ^^^^^^^

// Test case 4: Template literal with expressions (should trigger)
const name = "John";
const templateWithExpr = `h1 Hello ${name}`;
const fnWithExpr = pug.compile(templateWithExpr) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                     ^^^^^^^

// Test case 5: Using imported compile function directly
const importedCompile = compile(template) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                      ^^^^^^^

// Test case 6: Using namespace import
const namespaceFn = pugModule.compile(userInput) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                  ^^^^^^^^^^^^^^^^^^

// Test case 7: Concatenated strings (should trigger)
const concatenated = 'h1 ' + getUserTitle();
const concatFn = pug.compile(concatenated) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                   ^^^^^^^

// Test case 8: Array join (should trigger)
const parts = ['div', getUserClassName()];
const joined = parts.join(' ');
const joinedFn = pug.compile(joined) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                   ^^^^^^^

// Test case 9: Function constructor (should trigger)
const code = getUserCode();
const evalFn = new Function(code); // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                 ^^^^^^^^
const evalFn2 = new Function('return 42'); // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                  ^^^^^^^^

// Test case 10: Function constructor with static string (still unsafe)
const staticEval = new Function('console.log("hello")'); // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                     ^^^^^^^^

// Test case 11: Ternary operator with dynamic value
const conditionalTemplate = isDev() ? getDevTemplate() : getProdTemplate();
const conditionalFn = pug.compile(conditionalTemplate) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                        ^^^^^^^

// Test case 12: Object property access
const templates = {
  home: getHomeTemplate(),
  about: 'h1 About Us'
};
const objectFn = pug.compile(templates.home) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                   ^^^^^^^
const objectFn2 = pug.compile(templates.about) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                    ^^^^^^^
//- can't determine if property is static

// Test case 13: Function call result
function getTemplate() {
  return 'h1 Dynamic';
}
const funcResultFn = pug.compile(getTemplate()) // Noncompliant {{Make sure executing a dynamically formatted template is safe here.}}
//                       ^^^^^^^

// Test case 14: Regular function calls (not pug.compile)
function compile(str: string) {
  return str;
}
const notPugCompile = compile('test'); // Compliant - not from pug module

// Test case 15: Other pug methods (compliant)
const rendered = pug.render('h1 Hello'); // Compliant - not compile
const renderFile = pug.renderFile('template.pug'); // Compliant - not compile

// Helper functions for testing
function getUserInput(): string {
  return 'user-controlled-template';
}

function getUserTitle(): string {
  return 'User Title';
}

function getUserClassName(): string {
  return 'user-class';
}

function getUserCode(): string {
  return 'alert("XSS")';
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function getDevTemplate(): string {
  return 'div Development';
}

function getProdTemplate(): string {
  return 'div Production';
}

function getHomeTemplate(): string {
  return 'h1 Home';
}
