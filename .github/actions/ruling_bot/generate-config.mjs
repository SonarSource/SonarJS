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
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inputDefinitions } from './config.mjs';
import { rulingConfig } from '../../ruling-bot.config.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scalar = value => {
  const text = String(value);
  return !text || /^(?:\d+|true|false|null)$/.test(text) || /[\n]|:\s/.test(text)
    ? `'${text.replaceAll("'", "''")}'`
    : text;
};
const expression = value => '${{ ' + value + ' }}';
const githubString = value => "'" + String(value).replaceAll("'", "''") + "'";
const shellArgument = value =>
  /^[\w./:#=-]+$/.test(value) ? value : "'" + value.replaceAll("'", "'\\''") + "'";

function markdownSection(text, name, body) {
  const pattern = new RegExp(
    `<!-- BEGIN GENERATED ${name} -->\\n[\\s\\S]*?<!-- END GENERATED ${name} -->`,
  );
  if (!pattern.test(text)) throw new Error(`Missing generated section: ${name}`);
  return text.replace(
    pattern,
    `<!-- BEGIN GENERATED ${name} -->\n\n${body}\n\n<!-- END GENERATED ${name} -->`,
  );
}

function inputTable(definitions) {
  const rows = [
    ['Input', 'Purpose', 'Generic default'],
    ...Object.entries(definitions).map(([name, value]) => [
      '`' + name + '`',
      value.description,
      value.required ? 'Required' : value.default === '' ? 'Empty' : '`' + value.default + '`',
    ]),
  ];
  const widths = rows[0].map((_, index) => Math.max(...rows.map(row => row[index].length)));
  const render = row =>
    '| ' + row.map((value, index) => value.padEnd(widths[index])).join(' | ') + ' |';
  return [
    render(rows[0]),
    render(widths.map(width => '-'.repeat(width))),
    ...rows.slice(1).map(render),
  ].join('\n');
}

function section(text, name, body) {
  const pattern = new RegExp(
    `^( *)# BEGIN GENERATED ${name}\\n[\\s\\S]*?^\\1# END GENERATED ${name}`,
    'gm',
  );
  let count = 0;
  const result = text.replace(pattern, (_, indent) => {
    count++;
    return (
      `${indent}# BEGIN GENERATED ${name}\n` +
      `${indent}# Owned by config.mjs / .github/ruling-bot.config.mjs; run generate-config.mjs.\n` +
      body
        .split('\n')
        .map(line => indent + line)
        .join('\n') +
      `\n${indent}# END GENERATED ${name}`
    );
  });
  if (!count) throw new Error(`Missing generated section: ${name}`);
  return result;
}

export function generatedFiles(config = rulingConfig, definitions = inputDefinitions) {
  const names = Object.keys(definitions);
  const files = new Map();
  const metadata = dispatch =>
    names
      .flatMap(name => {
        const definition = definitions[name];
        const lines = [
          `${name}:`,
          `  description: ${scalar(definition.description)}`,
          `  required: ${!dispatch && !!definition.required}`,
        ];
        if (dispatch) lines.push('  type: string');
        const value = dispatch
          ? name === 'results-artifact-name'
            ? ''
            : config[name]
          : definition.default;
        if (value !== undefined) lines.push(`  default: ${scalar(value)}`);
        return lines;
      })
      .join('\n');
  const env = names
    .map(name => `${name.replaceAll('-', '_').toUpperCase()}: ${expression(`inputs.${name}`)}`)
    .join('\n');
  for (const name of ['action.yml', 'report/action.yml']) {
    const file = `.github/actions/ruling_bot/${name}`;
    let text = section(
      readFileSync(path.join(repositoryRoot, file), 'utf8'),
      'CONFIG INPUTS',
      metadata(false),
    );
    text = section(text, 'CONFIG ENV', env);
    files.set(file, text);
  }
  const build = '.github/workflows/build.yml';
  let text = readFileSync(path.join(repositoryRoot, build), 'utf8');
  text = section(
    text,
    'CALLER CONFIG',
    names
      .map(
        name =>
          `${name}: ${
            name === 'results-artifact-name'
              ? expression('needs.js_ts_ruling.outputs.results-artifact-name')
              : scalar(config[name])
          }`,
      )
      .join('\n'),
  );
  text = section(
    text,
    'ARTIFACT NAME',
    `run: echo "name=${config['results-artifact-name']}-\${GITHUB_RUN_ATTEMPT}" >> "$GITHUB_OUTPUT"`,
  );
  text = section(text, 'RESULTS PATH', `path: ${scalar(config['new-results-path'] + '/')}`);
  text = section(
    text,
    'DISPATCH RECORD',
    `- name: ${scalar(config['report-dispatch-step'])}\n  if: steps.ruling_update.outputs.report-requested == 'true'\n  run: echo 'Independent ruling report dispatch succeeded.'`,
  );
  files.set(build, text);
  const report = '.github/workflows/ruling-diff-comment.yml';
  text = section(
    readFileSync(path.join(repositoryRoot, report), 'utf8'),
    'CONFIG INPUTS',
    metadata(true),
  );
  text = section(
    text,
    'REPORT CONFIG',
    names
      .map(name => {
        const value =
          name === 'results-artifact-name'
            ? `inputs.${name} || format(${githubString(config[name] + '-{0}')}, inputs.run-attempt || '1')`
            : `github.event_name == 'pull_request' && ${githubString(config[name])} || inputs.${name}`;
        return `${name}: ${expression(value)}`;
      })
      .join('\n'),
  );
  files.set(report, text);
  // The local npm command consumes the same expectation paths as the workflow/action callers.
  const pkg = 'package.json';
  const source = readFileSync(path.join(repositoryRoot, pkg), 'utf8');
  const command = `node .github/actions/ruling_bot/sync-results.mjs ${shellArgument(config['new-results-path'])} ${shellArgument(config['old-results-path'])}`;
  files.set(pkg, source.replace(/("ruling-sync": )"[^\n]*"/, '$1' + JSON.stringify(command)));
  const readme = '.github/actions/ruling_bot/README.md';
  files.set(
    readme,
    markdownSection(
      readFileSync(path.join(repositoryRoot, readme), 'utf8'),
      'INPUT TABLE',
      inputTable(definitions),
    ),
  );
  const guide = 'docs/CI.md';
  const provenance = {
    'pr-number': '<original-pr-number>',
    'head-sha': '<tested-merge-sha>',
    'base-sha': '<tested-merge-first-parent-sha>',
    'is-pull-request': 'true',
    'run-id': '<build-run-id>',
    'run-attempt': '<current-build-run-attempt>',
    'ruling-failed': 'true',
    'fix-pr-url': '<fix-pr-url>',
    'target-ref': '<original-branch>',
  };
  const fields = {
    ...provenance,
    ...config,
    'results-artifact-name': config['results-artifact-name'] + '-<producing-ruling-job-attempt>',
  };
  const retry = [
    `gh workflow run ${shellArgument(config['report-workflow'])} --ref '<reporter-ref>'`,
    ...Object.entries(fields).map(([name, value]) => `  -f ${shellArgument(name + '=' + value)}`),
  ].join(' \\\n');
  files.set(
    guide,
    markdownSection(
      readFileSync(path.join(repositoryRoot, guide), 'utf8'),
      'RETRY COMMAND',
      '```sh\n' + retry + '\n```',
    ),
  );
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [file, generated] of generatedFiles()) {
    const target = path.join(repositoryRoot, file);
    if (process.argv.includes('--check')) {
      if (readFileSync(target, 'utf8') !== generated)
        throw new Error(`Generated ruling configuration is stale: ${file}`);
    } else writeFileSync(target, generated);
  }
}
