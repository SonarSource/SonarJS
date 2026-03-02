/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
/**
 * Syncs RSPEC rule metadata and descriptions from the SonarSource/rspec repository.
 *
 * Usage:
 *   tsx tools/sync-rspec.ts --language javascript|css [--rspec-path <path>]
 *
 * If --rspec-path is not provided, the script looks for a clone at resources/rspec.
 * If that doesn't exist, it clones the repo automatically (requires GITHUB_TOKEN).
 * If the clone already exists, it fetches the latest changes first.
 *
 * For each rule that has a <language>/metadata.json in the rspec repo:
 * - Merges parent + language-specific metadata.json → resources/rule-data/<language>/<rule>.json
 * - Renders <language>/rule.adoc to HTML → resources/rule-data/<language>/<rule>.html
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import Asciidoctor from '@asciidoctor/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DEFAULT_RSPEC_PATH = join(ROOT_DIR, 'resources', 'rspec');
const RSPEC_REPO_SSH = 'git@github.com:SonarSource/rspec.git';
const RSPEC_BRANCH = 'dogfood-automerge';

// Language identifiers used for rule cross-reference links (matches rule-api Language.getSq())
const LANGUAGE_SQ: Record<string, string> = {
  javascript: 'javascript',
  css: 'css',
};

const CODE_PATTERN = /.*<code[\s\w"=-]*$/s;
const PRE_PATTERN = /.*<pre[\s\w"=-]*$/s;

/**
 * Post-process rendered HTML to replace rule references (e.g. S1234) with
 * {rule:lang:S1234} placeholders, matching the rule-api populateLinks behavior.
 * Only replaces outside <code> and <pre> blocks.
 */
function populateLinks(langSq: string, html: string): string {
  const segments = html.split('>');
  let inVerbatim = false;

  for (let i = 0; i < segments.length; i++) {
    if (!inVerbatim) {
      segments[i] = segments[i].replace(/(\b)(S\d{3,})/g, `$1{rule:${langSq}:$2}`);
    }
    if (CODE_PATTERN.test(segments[i]) || PRE_PATTERN.test(segments[i])) {
      inVerbatim = true;
    }
    if (segments[i].endsWith('</code') || segments[i].endsWith('</pre')) {
      inVerbatim = false;
    }
  }

  return segments.join('>');
}

/**
 * Sanitize Asciidoctor HTML output to match sonar-rule-api HtmlSanitizer behavior:
 * - Remove all <div> wrappers (keep children)
 * - Remove <p> inside <li> (keep children)
 * - Remove class, id, type attributes from all elements
 * - Unwrap <code data-lang="..."> inside <pre> (remove syntax highlighting wrapper)
 * - Keep data-diff-id and data-diff-type attributes on <pre>
 */
function sanitizeHtml(html: string): string {
  // Remove all <div ...> and </div> tags (unwrap contents)
  let result = html.replace(/<\/?div[^>]*>/g, '');

  // Remove <code data-lang="..."> and </code> inside pre blocks (syntax highlighting)
  result = result.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, block =>
    block.replace(/<code[^>]*data-lang="[^"]*"[^>]*>([\s\S]*?)<\/code>/g, '$1'),
  );

  // Remove class, id, type attributes (matching HtmlSanitizer.removeAttrs)
  result = result.replace(/\s+(?:class|id|type)="[^"]*"/g, '');

  // Remove <p> inside <li> (unwrap)
  result = result.replace(/<li>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/g, '<li>$1</li>');

  // Put pre content on own lines (matches HtmlSanitizer.putPreOnOwnLines)
  result = result.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_, attrs, content) => {
    let c = content;
    if (!c.startsWith('\n')) c = '\n' + c;
    if (!c.endsWith('\n')) c = c + '\n';
    return `<pre${attrs}>${c}</pre>`;
  });

  // Clean up whitespace: collapse multiple blank lines
  result = result.replace(/\n{3,}/g, '\n');

  // Trim leading/trailing whitespace
  result = result.trim() + '\n';

  return result;
}

const { values } = parseArgs({
  options: {
    'rspec-path': { type: 'string' },
    language: { type: 'string' },
  },
  strict: true,
});

const language = values['language'] as string | undefined;

if (!language || !['javascript', 'css'].includes(language)) {
  console.error('Error: --language must be "javascript" or "css"');
  process.exit(1);
}

const explicitPath = values['rspec-path'] as string | undefined;
const rspecPath = resolve(explicitPath ?? DEFAULT_RSPEC_PATH);
const isManagedClone = !explicitPath;

if (!existsSync(join(rspecPath, 'rules'))) {
  if (!isManagedClone) {
    console.error(`Error: rspec repo not found at ${rspecPath}`);
    process.exit(1);
  }
  console.log(`Cloning rspec repo (sparse) to ${rspecPath}...`);
  const token = process.env.GITHUB_TOKEN;
  const repoUrl = token
    ? `https://x-access-token:${token}@github.com/SonarSource/rspec.git`
    : RSPEC_REPO_SSH;
  mkdirSync(rspecPath, { recursive: true });
  execSync(`git clone --depth 1 --sparse --branch ${RSPEC_BRANCH} ${repoUrl} ${rspecPath}`, {
    stdio: 'inherit',
  });
  execSync('git sparse-checkout set rules external_refs shared_content', {
    cwd: rspecPath,
    stdio: 'inherit',
  });
} else if (isManagedClone) {
  // Only auto-fetch for the managed clone, not user-provided paths
  console.log(`Fetching latest changes in ${rspecPath}...`);
  try {
    execSync(`git fetch --depth 1 origin ${RSPEC_BRANCH} && git reset --hard FETCH_HEAD`, {
      cwd: rspecPath,
      stdio: 'inherit',
    });
  } catch {
    console.warn('Warning: Failed to fetch latest changes, using existing data');
  }
}

// Initialize Asciidoctor
const asciidoctor = Asciidoctor();

// Register a custom converter to handle listing blocks with diff-id/diff-type attributes
// This matches the listing.html.slim template from sonar-rule-api
class SonarListingConverter {
  baseConverter: ReturnType<typeof asciidoctor.Html5Converter.create>;
  constructor() {
    this.baseConverter = asciidoctor.Html5Converter.create();
  }
  convert(node: any, transform?: string) {
    if ((transform || node.getNodeName()) === 'listing') {
      const diffId = node.getAttribute('diff-id');
      const diffType = node.getAttribute('diff-type');
      if (diffId && diffType) {
        return `<pre data-diff-id="${diffId}" data-diff-type="${diffType}">${node.getSource()}</pre>`;
      }
    }
    return this.baseConverter.convert(node, transform);
  }
}
asciidoctor.ConverterFactory.register(SonarListingConverter as any, ['html5']);

const langSq = LANGUAGE_SQ[language];
const rulesDir = join(rspecPath, 'rules');
const externalRefsPath = join(rspecPath, 'external_refs', 'ExternalReferences.adoc');
const outputDir = join(ROOT_DIR, 'resources', 'rule-data', language);

// Clean and recreate output directory
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const ruleRegex = /^S\d+$/;
const ruleDirs = readdirSync(rulesDir).filter(name => ruleRegex.test(name));

let count = 0;

for (const ruleName of ruleDirs) {
  const languageDir = join(rulesDir, ruleName, language);
  const languageMetadataPath = join(languageDir, 'metadata.json');
  let languageMetadata: Record<string, unknown>;
  try {
    languageMetadata = JSON.parse(readFileSync(languageMetadataPath, 'utf-8'));
  } catch {
    // Rule doesn't have this language — skip
    continue;
  }

  const parentMetadataPath = join(rulesDir, ruleName, 'metadata.json');
  let parentMetadata: Record<string, unknown>;
  try {
    parentMetadata = JSON.parse(readFileSync(parentMetadataPath, 'utf-8'));
  } catch {
    console.warn(`Warning: No parent metadata.json for ${ruleName}, skipping`);
    continue;
  }

  // Write merged JSON metadata
  const merged = { ...parentMetadata, ...languageMetadata };
  writeFileSync(join(outputDir, `${ruleName}.json`), JSON.stringify(merged, null, 2) + '\n');

  // Render adoc to HTML
  const adocPath = join(languageDir, 'rule.adoc');
  if (existsSync(adocPath)) {
    let adocContent = readFileSync(adocPath, 'utf-8');

    // Prepend external references (same as rule-api)
    if (existsSync(externalRefsPath)) {
      adocContent = `include::${externalRefsPath}[]\n\n${adocContent}`;
    }

    const html = asciidoctor.convert(adocContent, {
      safe: 'unsafe',
      base_dir: languageDir,
      attributes: { 'attribute-missing': 'warn' },
    }) as string;

    writeFileSync(join(outputDir, `${ruleName}.html`), populateLinks(langSq, sanitizeHtml(html)));
  }

  count++;
}

console.log(`Synced ${count} ${language} rules to ${outputDir}`);
