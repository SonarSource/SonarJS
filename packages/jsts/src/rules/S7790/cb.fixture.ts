import fs from 'node:fs/promises';
import pug from 'pug';

template = await fs.readFile('views/userProfile.pug', { encoding: 'utf-8' })

const fn = pug.compile(template)

fn("data")
