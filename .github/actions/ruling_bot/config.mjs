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

export const defaults = {
  'sources-path': 'its/sources',
  'sources-repo-url': '',
  'rspec-base-url': 'https://sonarsource.github.io/rspec/#/rspec',
  'max-inline-snippets': '10',
  'results-artifact-name': 'ruling-results',
  'report-workflow': 'ruling-diff-comment.yml',
  'report-workflow-ref': '',
};

export function configuration(value, repositoryRoot = process.cwd()) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Ruling configuration must be an object.');
  const config = { ...defaults, ...value };
  for (const name of ['new-results-path', 'old-results-path']) {
    if (typeof config[name] !== 'string' || !config[name]) {
      throw new Error(`Missing ruling bot configuration: ${name}`);
    }
  }
  for (const name of ['new-results-path', 'old-results-path', 'sources-path']) {
    if (typeof config[name] !== 'string') throw new Error(`${name} must be a path string.`);
    if (name === 'sources-path' && config[name] === '') continue;
    const input = config[name].replaceAll('\\', '/');
    if (path.sep === '/' && /^[a-z]:/i.test(input))
      throw new Error(`${name} must be inside the tested repository.`);
    const relative = path.relative(
      path.resolve(repositoryRoot),
      path.resolve(repositoryRoot, input),
    );
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`${name} must be inside the tested repository.`);
    }
    config[name] = relative.split(path.sep).join('/') || '.';
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
  return config;
}

export function environmentConfiguration(env) {
  return configuration(
    Object.fromEntries(
      ['new-results-path', 'old-results-path', ...Object.keys(defaults)]
        .filter(name => env[name.replaceAll('-', '_').toUpperCase()] !== undefined)
        .map(name => [name, env[name.replaceAll('-', '_').toUpperCase()]]),
    ),
    env.RULING_REPOSITORY_PATH || env.GITHUB_WORKSPACE || process.cwd(),
  );
}
