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
import { readdir, writeFile, readFile, stat } from 'fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prettier as prettierOpts } from '../package.json';
import traverse from 'json-schema-traverse';

const ruleRegex = /^S\d+/;
export const DIRNAME = dirname(fileURLToPath(import.meta.url));
export const TS_TEMPLATES_FOLDER = join(DIRNAME, 'templates', 'ts');
export const JAVA_TEMPLATES_FOLDER = join(DIRNAME, 'templates', 'java');
export const RULES_FOLDER = join(DIRNAME, '..', 'packages', 'jsts', 'src', 'rules');
export const METADATA_FOLDER = join(
  DIRNAME,
  '..',
  'sonar-plugin',
  'javascript-checks',
  'src',
  'main',
  'resources',
  'org',
  'sonar',
  'l10n',
  'javascript',
  'rules',
  'javascript',
);
export const header = await readFile(join(DIRNAME, 'header.ts'), 'utf8');

const typeMatrix = {
  CODE_SMELL: 'suggestion',
  BUG: 'problem',
  SECURITY_HOTSPOT: 'problem',
  VULNERABILITY: 'problem',
} as const;

type rspecMeta = {
  type: keyof typeof typeMatrix;
  status: 'ready' | 'beta' | 'closed' | 'deprecated' | 'superseded';
  title: string;
  quickfix: 'covered' | undefined;
  tags: string[];
};

const sonarWayProfile = JSON.parse(
  await readFile(join(METADATA_FOLDER, `Sonar_way_profile.json`), 'utf-8'),
);

// Array sorter for Sonar rule IDs
const getInt = (sonarKey: string) => parseInt(/^S(\d+)/.exec(sonarKey)[1]);
const sonarKeySorter = (a: string, b: string) => getInt(a) - getInt(b);

export function verifyRuleName(eslintId: string) {
  const re = /^[a-z]+(-[a-z0-9]+)*$/;
  if (!re.exec(eslintId)) {
    throw new Error(`Invalid class name: it should match ${re}, but got "${eslintId}"`);
  }
}

export function verifyRspecId(sonarKey: string) {
  const re = /^S\d+$/;
  if (!re.exec(sonarKey)) {
    throw new Error(`Invalid rspec key: it should match ${re}, but got "${sonarKey}"`);
  }
}

/**
 * Inflate string template with given dictionary
 * @param text template string
 * @param dictionary object with the keys to replace
 */
export function inflateTemplate(text: string, dictionary: { [x: string]: string }): string {
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
 */
export async function inflateTemplateToFile(
  templatePath: string,
  dest: string,
  dict: { [x: string]: string },
) {
  const template = await readFile(templatePath, 'utf8');
  await writePrettyFile(dest, inflateTemplate(template, dict));
}

export async function prepareProps(sonarKey: string) {
  const {
    rule: {
      meta: { schema },
    },
  } = await import(join(RULES_FOLDER, sonarKey));
  if (!schema || schema.length === 0) {
    return;
  }
  let schemaArr = Array.isArray(schema) ? schema : [schema];
  let nonEmpty = false;
  const props = schemaArr.map((schemaObj, idx) => {
    const props = [];
    const cb = (sch, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) => {
      if (jsonPtr === '' && 'enum' in sch && !sch['enum'].includes('sonar-runtime')) {
        props.push('enum');
        nonEmpty = true;
        return;
      }
      if (parentKeyword !== 'properties') return;
      nonEmpty = true;
      let prop;
      if (sch.type === 'array') {
        prop = {
          field: keyIndex,
          type: sch.type,
          items: sch.items,
        };
      } else {
        prop = {
          field: keyIndex,
          type: sch.type,
        };
      }
      props.push(prop);
    };
    traverse(schemaObj, { cb });
    return props;
  });
  if (nonEmpty) {
    await inflateTemplateToFile(
      join(TS_TEMPLATES_FOLDER, 'configs.template'),
      join(RULES_FOLDER, sonarKey, 'config.ts'),
      {
        ___HEADER___: header,
        ___FIELDS___: JSON.stringify(props, null, 2),
        ___RULE_KEY___: sonarKey,
      },
    );
    console.log(sonarKey, JSON.stringify(schema, null, 2));
    console.log(JSON.stringify(props, null, 2));
  }
}

/**
 * From the RSPEC json file, creates a generated-meta.ts file with ESLint formatted metadata
 *
 * @param sonarKey rule ID for which we need to create the generated-meta.ts file
 */
export async function generateMetaForRule(sonarKey: string) {
  const rspecFile = join(METADATA_FOLDER, `${sonarKey}.json`);
  const rspecFileExists = await exists(rspecFile);
  const ruleRspecMeta: rspecMeta = rspecFileExists
    ? JSON.parse(await readFile(rspecFile, 'utf-8'))
    : {
        // Dummy data to create compilable new rule metadata
        title: 'Description',
        tags: [],
        type: 'BUG',
        status: 'ready',
        quickfix: 'covered',
      };

  if (!rspecFileExists) {
    console.log(
      `RSPEC metadata not found for rule ${sonarKey}. Creating dummy "generated-meta.ts"`,
    );
  }

  if (!typeMatrix[ruleRspecMeta.type]) {
    console.log(`Type not found for rule ${sonarKey}`);
  }

  const ruleFolder = join(RULES_FOLDER, sonarKey);
  const schemaFile = join(ruleFolder, `schema.json`);
  let schema = '';
  if (await exists(schemaFile)) {
    try {
      schema = `\nimport type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';\nexport const schema = ( ${await readFile(schemaFile, 'utf-8')} ) as const satisfies JSONSchema4;`;
    } catch {}
  }

  await inflateTemplateToFile(
    join(TS_TEMPLATES_FOLDER, 'generated-meta.template'),
    join(ruleFolder, `generated-meta.ts`),
    {
      ___HEADER___: header,
      ___RULE_TYPE___: typeMatrix[ruleRspecMeta.type],
      ___RULE_KEY___: sonarKey,
      ___DESCRIPTION___: ruleRspecMeta.title.replace(/'/g, "\\'"),
      ___RECOMMENDED___: sonarWayProfile.ruleKeys.includes(sonarKey),
      ___TYPE_CHECKING___: `${ruleRspecMeta.tags.includes('type-dependent')}`,
      ___FIXABLE___: ruleRspecMeta.quickfix === 'covered' ? "'code'" : undefined,
      ___DEPRECATED___: `${ruleRspecMeta.status === 'deprecated'}`,
      ___RULE_SCHEMA___: schema,
    },
  );
}

/**
 * Get path to Java source
 *
 * @param target whether get source path to "main" or "test" files
 */
export function javaChecksPath(target: 'main' | 'test') {
  return join(
    DIRNAME,
    '../',
    'sonar-plugin',
    'javascript-checks',
    'src',
    target,
    'java',
    'org',
    'sonar',
    'javascript',
    'checks',
  );
}

/**
 * List all Java checks classes
 */
export async function getAllJavaChecks() {
  const files = await readdir(javaChecksPath('main'), { withFileTypes: true });
  return files
    .filter(file => ruleRegex.test(file.name) && !file.isDirectory())
    .map(file => file.name.slice(0, -5)) // remove .java extension
    .sort(sonarKeySorter);
}

/**
 * Get the metadata for all rules in SonarJS
 */
export async function getAllRulesMetadata() {
  const rulesMetadata = [];
  for (const file of await listRulesDir()) {
    rulesMetadata.push(await import(pathToFileURL(join(RULES_FOLDER, file, 'meta.js')).toString()));
  }
  return rulesMetadata;
}

/**
 * List all rules in SonarJS
 */
export async function listRulesDir() {
  const files = await readdir(RULES_FOLDER, { withFileTypes: true });
  return files
    .filter(file => ruleRegex.test(file.name) && file.isDirectory())
    .map(file => file.name)
    .sort(sonarKeySorter);
}

async function exists(file: string) {
  return stat(file)
    .then(() => true)
    .catch(() => false);
}

export async function writePrettyFile(filepath: string, contents: string) {
  await writeFile(
    filepath,
    await prettier.format(contents, {
      ...(prettierOpts as prettier.Options),
      filepath,
      plugins: ['prettier-plugin-java'],
    }),
  );
}
