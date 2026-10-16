/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'node:path';
import { statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Canonical public configuration. Action/workflow metadata is generated from this schema.
export const inherit = 'inherit';
const configurationDefaults = Symbol('configurationDefaults');
const pathInputs = ['new-results-path', 'old-results-path', 'sources-path', 'config-file'];

export const workflowInputsDefinition = {
  description: 'Workflow inputs from toJSON(inputs); individual action inputs take precedence',
  default: '{}',
  env: 'RULING_WORKFLOW_INPUTS',
};

export const inputDefinitions = {
  'config-file': {
    description:
      'Optional configuration module in the tested checkout; empty uses generic defaults',
    default: '.github/ruling-bot.config.mjs',
  },
  'new-results-path': {
    description: 'Generated-results path within the tested repository',
    required: true,
  },
  'old-results-path': {
    description: 'Expected-results path within the tested repository',
    required: true,
  },
  'sources-path': {
    description: 'Local source checkout used for snippets; empty disables snippets',
    default: 'its/sources',
  },
  'sources-repo-url': {
    description: 'Remote source URL used for file links; empty disables links',
    default: '',
  },
  'rspec-base-url': {
    description: 'RSPEC URL used for rule links; empty disables links',
    default: 'https://sonarsource.github.io/rspec/#/rspec',
  },
  'max-inline-snippets': {
    description: 'Maximum detailed snippets per report section',
    default: '10',
  },
  'results-artifact-name': {
    description: 'Exact saved generated-results artifact name',
    default: 'ruling-results',
  },
  'report-workflow': {
    description: 'Reporter workflow filename or ID',
    default: 'ruling-diff-comment.yml',
  },
  'report-workflow-ref': {
    description: 'Reporter workflow ref; empty selects the tested target branch',
    default: '',
  },
  'build-workflow': {
    description: 'Build workflow filename or ID used to find authoritative dispatches',
    default: 'build.yml',
  },
  'report-dispatch-step': {
    description: 'Build step recording a successful ruling report request',
    default: 'Record ruling report dispatch',
  },
};
export const defaults = Object.fromEntries(
  Object.entries(inputDefinitions)
    .filter(([, value]) => 'default' in value)
    .map(([name, value]) => [name, value.default]),
);

export function configuration(value, repositoryRoot = process.cwd(), base = defaults) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Ruling configuration must be an object.');
  for (const name of Object.keys(value)) {
    if (!(name in inputDefinitions)) throw new Error(`Unknown ruling configuration: ${name}`);
  }
  const config = { ...base, ...value };
  for (const name of ['build-workflow', 'report-dispatch-step']) {
    if (typeof config[name] !== 'string' || !config[name]) {
      throw new Error(`${name} must be a non-empty string.`);
    }
  }
  for (const name of ['new-results-path', 'old-results-path']) {
    if (typeof config[name] !== 'string' || !config[name]) {
      throw new Error(`Missing ruling bot configuration: ${name}`);
    }
  }
  for (const name of pathInputs) config[name] = relativePath(name, config[name], repositoryRoot);
  for (const name of Object.keys(inputDefinitions)) {
    if (name !== 'max-inline-snippets' && typeof config[name] !== 'string')
      throw new Error(`${name} must be a string.`);
  }
  const newPath = path.posix.resolve('/', config['new-results-path'].replaceAll('\\', '/'));
  const oldPath = path.posix.resolve('/', config['old-results-path'].replaceAll('\\', '/'));
  if (
    [newPath, oldPath].some(
      value => value === '/' || value === '/.git' || value.startsWith('/.git/'),
    ) ||
    newPath === oldPath ||
    newPath.startsWith(`${oldPath}/`) ||
    oldPath.startsWith(`${newPath}/`)
  ) {
    throw new Error('Result paths must be separate non-root directories.');
  }
  if (
    !Number.isSafeInteger(Number(config['max-inline-snippets'])) ||
    Number(config['max-inline-snippets']) < 1
  )
    throw new Error('max-inline-snippets must be a positive integer.');
  const baseline = { ...base, 'config-file': defaults['config-file'] };
  for (const name of pathInputs) {
    if (baseline[name] !== undefined)
      baseline[name] = relativePath(name, baseline[name], repositoryRoot);
  }
  Object.defineProperty(config, configurationDefaults, { value: baseline });
  return config;
}

function relativePath(name, value, repositoryRoot) {
  if (typeof value !== 'string') throw new Error(`${name} must be a path string.`);
  if ((name === 'sources-path' || name === 'config-file') && value === '') return '';
  const input = value.replaceAll('\\', '/');
  if (path.sep === '/' && /^[a-z]:/i.test(input))
    throw new Error(`${name} must be inside the tested repository.`);
  const relative = path.relative(path.resolve(repositoryRoot), path.resolve(repositoryRoot, input));
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`${name} must be inside the tested repository.`);
  return relative.split(path.sep).join('/') || '.';
}

function providedInputs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Workflow inputs must be an object.');
  return Object.fromEntries(
    Object.keys(inputDefinitions)
      .filter(name => value[name] !== undefined && value[name] !== inherit)
      .map(name => [name, value[name]]),
  );
}

async function repositoryDefaults(file, root) {
  if (!file) return defaults;
  const absolute = path.resolve(root, file);
  try {
    statSync(absolute);
  } catch (error) {
    if (error.code === 'ENOENT' && file === defaults['config-file']) return defaults;
    throw error;
  }
  const module = await import(pathToFileURL(absolute).href);
  const value = module.rulingConfig ?? module.default;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('The configuration module must export a rulingConfig object.');
  for (const name of Object.keys(value)) {
    if (!(name in inputDefinitions)) throw new Error(`Unknown ruling configuration: ${name}`);
  }
  return { ...defaults, ...value };
}

export async function environmentConfiguration(env) {
  const root = env.RULING_REPOSITORY_PATH || env.GITHUB_WORKSPACE || process.cwd();
  const workflow = providedInputs(JSON.parse(env.RULING_WORKFLOW_INPUTS || '{}') ?? {});
  const explicit = providedInputs(
    Object.fromEntries(
      Object.keys(inputDefinitions).map(name => [
        name,
        env[name.replaceAll('-', '_').toUpperCase()],
      ]),
    ),
  );
  const values = { ...workflow, ...explicit };
  const file = relativePath('config-file', values['config-file'] ?? defaults['config-file'], root);
  const base = await repositoryDefaults(file, root);
  return configuration({ ...values, 'config-file': file }, root, base);
}

export function configurationOverrides(config) {
  const baseline = config[configurationDefaults] || defaults;
  return Object.fromEntries(
    Object.entries(config)
      .filter(([name, value]) => String(value) !== String(baseline[name]))
      // Preserve literal paths named "inherit" after normalization.
      .map(([name, value]) => [
        name,
        pathInputs.includes(name) && value === inherit ? './' + value : value,
      ]),
  );
}
