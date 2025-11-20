import fs from 'node:fs/promises';
import pug from 'pug';
import { compile } from 'pug';
import * as pugModule from 'pug';
import ejs from 'ejs';
const ejsRequire = require('ejs');

// Test case 1: Variable template from file system (should trigger)
const template = await fs.readFile('views/userProfile.pug', { encoding: 'utf-8' });
const fn = pug.compile(template); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//         ^^^^^^^^^^^
fn('data');

// Test case 2: Static string templates (compliant)
const staticFn = pug.compile('h1 Hello World'); // Compliant - static string
const staticFn2 = pug.compile('div.container p Welcome'); // Compliant - static string
const staticFn3 = pug.compile(`div
  h1 Static Template
  p This is safe`); // Compliant - template literal without expressions

// Test case 3: Dynamic templates with variables (should trigger)
const userInput = getUserInput();
const dynamicFn = pug.compile(userInput); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                ^^^^^^^^^^^

// Test case 4: Template literal with expressions (should trigger)
const name = 'John';
const templateWithExpr = `h1 Hello ${name}`;
const fnWithExpr = pug.compile(templateWithExpr); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                 ^^^^^^^^^^^

// Test case 5: Using imported compile function directly
const importedCompile = compile(template); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                      ^^^^^^^

// Test case 6: Using namespace import
const namespaceFn = pugModule.compile(userInput); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                  ^^^^^^^^^^^^^^^^^

// Test case 7: Concatenated strings (should trigger)
const concatenated = 'h1 ' + getUserTitle();
const concatFn = pug.compile(concatenated); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//               ^^^^^^^^^^^

// Test case 8: Array join (should trigger)
const parts = ['div', getUserClassName()];
const joined = parts.join(' ');
const joinedFn = pug.compile(joined); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//               ^^^^^^^^^^^

// Test case 9: Using pug.render with dynamic input (should trigger)
const code = getUserCode();
const renderDynamic = pug.render(code); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                    ^^^^^^^^^^

// Test case 10: Using pug.render with concatenation (should trigger)
const renderConcat = pug.render('h1 ' + getUserTitle()); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                   ^^^^^^^^^^

// Test case 11: Ternary operator with dynamic value
const conditionalTemplate = isDev() ? getDevTemplate() : getProdTemplate();
const conditionalFn = pug.compile(conditionalTemplate); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                    ^^^^^^^^^^^

// Test case 12: Object property access
const templates = {
  home: getHomeTemplate(),
  about: 'h1 About Us',
};
const objectFn = pug.compile(templates.home); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//               ^^^^^^^^^^^
const objectFn2 = pug.compile(templates.about); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                ^^^^^^^^^^^
//- can't determine if property is static

// Test case 13: Function call result
function getTemplate() {
  return 'h1 Dynamic';
}
const funcResultFn = pug.compile(getTemplate()); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                   ^^^^^^^^^^^

// Test case 14: pug.render with static string (compliant) and renderFile (not checked)
const rendered = pug.render('h1 Hello'); // Compliant - static string
const renderFile = pug.renderFile('template.pug'); // Compliant - renderFile not in the checked functions

// Test case 15: EJS compile with dynamic input (should trigger)
const ejsTemplate = getUserInput();
const ejsCompileFn = ejs.compile(ejsTemplate); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                   ^^^^^^^^^^^

// Test case 16: EJS render with dynamic input (should trigger)
const ejsRenderResult = ejs.render(ejsTemplate); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                      ^^^^^^^^^^

// Test case 17: EJS with require (should trigger)
const ejsRequireCompile = ejsRequire.compile(getUserInput()); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//                        ^^^^^^^^^^^^^^^^^^

// Test case 18: EJS with static string (compliant)
const ejsStaticCompile = ejs.compile('<h1>Hello <%= name %></h1>'); // Compliant - static string
const ejsStaticRender = ejs.render('<h1>Hello</h1>'); // Compliant - static string

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
