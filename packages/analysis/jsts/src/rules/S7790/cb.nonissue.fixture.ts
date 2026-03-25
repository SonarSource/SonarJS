import fs from 'node:fs/promises';
import pug from 'pug';

// Test case 1: Variable template from file system (should trigger)
const template = await fs.readFile('views/userProfile.pug', { encoding: 'utf-8' });
const fn = pug.compile(template); // Noncompliant {{Make sure this dynamically formatted template is safe here.}}
//         ^^^^^^^^^^^
fn('data');

// Test case 2: Regular function calls (not pug.compile)
function compile(str: string) {
  return str;
}
const notPugCompile = compile('test'); // Compliant - not from pug module
