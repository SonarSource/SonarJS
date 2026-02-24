import fs from 'node:fs/promises';
import pug from 'pug';

const template = await fs.readFile('myTemplate.pug', {encoding: 'utf-8'});
const fn = pug.compile(template); // Noncompliant
