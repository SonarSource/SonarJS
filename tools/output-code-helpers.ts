/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import prettier from 'prettier';
//@ts-ignore
import { prettier as prettierOpts } from '../package.json';
import { dirname } from 'node:path';
import { mkdir, readFile } from 'fs/promises';
import { writeFile } from 'node:fs/promises';

/**
 * Inflate string template with given dictionary
 * @param text template string
 * @param dictionary object with the keys to replace
 */
function inflateTemplate(text: string, dictionary: { [x: string]: string }): string {
  for (const key in dictionary) {
    text = text.replaceAll(key, dictionary[key]);
  }
  return text;
}

/**
 * Reads a template file, inflates it with the provided dictionary, and writes the prettified
 * result to destination file
 *
 * @param templatePath path to template file
 * @param dest destination file
 * @param dict dictionary to inflate the template
 * @param skipPrettify not prettifying will allow this writeFile to work without installing dependencies
 */
export async function inflateTemplateToFile(
  templatePath: string,
  dest: string,
  dict: { [x: string]: string },
  skipPrettify: boolean = false,
) {
  const template = await readFile(templatePath, 'utf8');
  await writePrettyFile(dest, inflateTemplate(template, dict), skipPrettify);
}

export async function writePrettyFile(filepath: string, contents: string, skipPrettify: boolean) {
  await mkdir(dirname(filepath), {
    recursive: true,
  }).then(async () =>
    writeFile(
      filepath,
      skipPrettify
        ? contents
        : await prettier.format(contents, {
            ...(prettierOpts as prettier.Options),
            filepath,
            plugins: ['prettier-plugin-java'],
          }),
    ),
  );
}
