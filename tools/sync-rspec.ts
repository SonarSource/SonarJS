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
import { readdir, readFile, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import Asciidoctor from '@asciidoctor/core';
import { parseDocument, DomUtils } from 'htmlparser2';
import { isTag, type ChildNode, type ParentNode } from 'domhandler';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DEFAULT_RSPEC_PATH = join(ROOT_DIR, 'resources', 'rspec');
const RSPEC_REPO_SSH = 'git@github.com:SonarSource/rspec.git';
const RSPEC_BRANCH = 'dogfood-automerge';
const STANDARD_TAG_APPLICABILITY_FILE = join(
  __dirname,
  'sync-rspec-standard-tag-applicability.json',
);

// Language identifiers used for rule cross-reference links (matches rule-api Language.getSq())
const LANGUAGE_SQ: Record<string, string> = {
  javascript: 'javascript',
  css: 'css',
};

const CODE_PATTERN = /.*<code[\s\w"=-]*$/s;
const PRE_PATTERN = /.*<pre[\s\w"=-]*$/s;
const HTML_SANITIZER_WRAP_WIDTH = 150;

type StandardTagApplicabilityConfig = {
  version: number;
  tagApplicability: Record<string, string[]>;
};

function readStandardTagApplicabilityConfig(): StandardTagApplicabilityConfig {
  const parsed: unknown = JSON.parse(readFileSync(STANDARD_TAG_APPLICABILITY_FILE, 'utf-8'));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(
      `Invalid standard tag applicability config at '${STANDARD_TAG_APPLICABILITY_FILE}': expected object`,
    );
  }
  const config = parsed as Partial<StandardTagApplicabilityConfig>;
  if (typeof config.version !== 'number') {
    throw new Error(
      `Invalid standard tag applicability config at '${STANDARD_TAG_APPLICABILITY_FILE}': missing numeric 'version'`,
    );
  }
  if (!config.tagApplicability || typeof config.tagApplicability !== 'object') {
    throw new Error(
      `Invalid standard tag applicability config at '${STANDARD_TAG_APPLICABILITY_FILE}': missing object 'tagApplicability'`,
    );
  }
  for (const [tag, languages] of Object.entries(config.tagApplicability)) {
    if (!Array.isArray(languages) || languages.some(language => typeof language !== 'string')) {
      throw new Error(
        `Invalid standard tag applicability config at '${STANDARD_TAG_APPLICABILITY_FILE}': '${tag}' must map to string[]`,
      );
    }
  }
  return config as StandardTagApplicabilityConfig;
}

const standardTagApplicabilityConfig = readStandardTagApplicabilityConfig();

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
  const doc = parseDocument(html, { decodeEntities: false });
  sanitizeDom(doc, false);
  const normalized = DomUtils.getOuterHTML(doc.children, { decodeEntities: false });
  const preNormalized = putPreOnOwnLines(normalized);
  return wrapLines(preNormalized, HTML_SANITIZER_WRAP_WIDTH);
}

function sanitizeDom(parent: ParentNode, insideListItem: boolean): void {
  let index = 0;
  while (index < parent.children.length) {
    const node = parent.children[index];
    if (!isTag(node)) {
      index++;
      continue;
    }

    // Keep parity with sonar-rule-api HtmlSanitizer.removeAttrs(...)
    // https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/utilities/HtmlSanitizer.java
    delete node.attribs.class;
    delete node.attribs.id;
    delete node.attribs.type;

    const shouldUnwrap =
      // HtmlSanitizer.removeAllByQuery(doc, "div")
      node.name === 'div' ||
      // HtmlSanitizer.removeAllByQuery(doc, "li p")
      (insideListItem && node.name === 'p') ||
      // HtmlSanitizer.removeSyntaxHighlighting(doc)
      (node.name === 'code' && node.attribs['data-lang'] !== undefined);

    if (shouldUnwrap) {
      unwrapNode(parent, index, node.children);
      continue;
    }

    sanitizeDom(node, insideListItem || node.name === 'li');
    index++;
  }

  relinkSiblings(parent);
}

function unwrapNode(parent: ParentNode, index: number, replacementNodes: ChildNode[]): void {
  for (const child of replacementNodes) {
    child.parent = parent;
  }
  parent.children.splice(index, 1, ...replacementNodes);
  relinkSiblings(parent);
}

function relinkSiblings(parent: ParentNode): void {
  for (let index = 0; index < parent.children.length; index++) {
    const node = parent.children[index];
    node.parent = parent;
    node.prev = index === 0 ? null : parent.children[index - 1];
    node.next = index === parent.children.length - 1 ? null : parent.children[index + 1];
  }
}

function putPreOnOwnLines(html: string): string {
  // Keep parity with HtmlSanitizer.putPreOnOwnLines(...)
  // https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/utilities/HtmlSanitizer.java
  return html.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/g, (_, attrs, content) => {
    let normalizedContent = content;
    if (!normalizedContent.startsWith('\n')) {
      normalizedContent = '\n' + normalizedContent;
    }
    if (!normalizedContent.endsWith('\n')) {
      normalizedContent += '\n';
    }
    return `<pre${attrs}>${normalizedContent}</pre>`;
  });
}

function wrapLines(html: string, wrapWidth: number): string {
  // Keep parity with HtmlSanitizer.wrapLines(...) + writeWrapped(...)
  // https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/utilities/HtmlSanitizer.java
  const lines = html.split('\n');
  let inPreTag = false;
  let output = '';
  for (const rawLine of lines) {
    const line = trimRight(rawLine);
    if (!isImpactedByPreTagStatus(inPreTag, line)) {
      output += writeWrapped(line, wrapWidth);
    } else {
      output += `${line}\n`;
    }
    inPreTag = updateInPreTagStatus(inPreTag, line);
  }
  return output;
}

function writeWrapped(line: string, wrapWidth: number): string {
  let remaining = line;
  if (remaining.length <= wrapWidth) {
    return `${remaining}\n`;
  }
  const padding = ' '.repeat(indentSize(remaining));
  let output = '';
  while (remaining.length > 0) {
    let spacePos = -1;
    if (remaining.length > wrapWidth) {
      spacePos = findBestSpacePosToSplit(remaining, wrapWidth);
    }
    if (spacePos !== -1 && spacePos > padding.length) {
      output += `${remaining.slice(0, spacePos)}\n`;
      remaining = padding + remaining.slice(spacePos + 1);
    } else {
      output += `${remaining}\n`;
      remaining = '';
    }
  }
  return output;
}

function trimRight(line: string): string {
  let lineEnd = line.length;
  while (lineEnd > 0 && line.charAt(lineEnd - 1) === ' ') {
    lineEnd--;
  }
  return line.slice(0, lineEnd);
}

function findBestSpacePosToSplit(line: string, wrapWidth: number): number {
  let spacePos = line.lastIndexOf(' ', wrapWidth);
  if (spacePos === -1) {
    spacePos = line.indexOf(' ', wrapWidth + 1);
  }
  return spacePos;
}

function isImpactedByPreTagStatus(previousInPreTag: boolean, line: string): boolean {
  return previousInPreTag || line.includes('<pre>') || line.includes('</pre>');
}

function updateInPreTagStatus(previousInPreTag: boolean, line: string): boolean {
  const openPrePos = line.indexOf('<pre');
  const closePrePos = line.indexOf('</pre>');
  const openPreTag = openPrePos !== -1 && openPrePos > closePrePos;
  const closePreTag = closePrePos !== -1 && closePrePos > openPrePos;
  return openPreTag || (previousInPreTag && !closePreTag);
}

function indentSize(text: string): number {
  let indent = 0;
  while (indent < text.length && text.charAt(indent) === ' ') {
    indent++;
  }
  return indent;
}

/**
 * Keep standards tag filtering equivalent to previous sonar-rule-api generation:
 * - AsciiDoctorConverter.filterApplicableStandards(...)
 *   https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/asciidoctor/AsciiDoctorConverter.java
 * - SupportedStandard / TaggableStandard language applicability
 *   https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/externalspecifications/SupportedStandard.java
 *
 * The applicability map is versioned in sync-rspec-standard-tag-applicability.json.
 */
function filterApplicableStandardTags(
  languageKey: string,
  metadata: Record<string, unknown>,
): void {
  const tags = metadata.tags;
  if (!Array.isArray(tags)) {
    return;
  }

  const filteredTags = tags.filter(tag => {
    if (typeof tag !== 'string') {
      return true;
    }
    const applicableLanguages = standardTagApplicabilityConfig.tagApplicability[tag];
    if (!applicableLanguages) {
      return true;
    }
    return applicableLanguages.includes('*') || applicableLanguages.includes(languageKey);
  });

  metadata.tags = filteredTags;
}

/**
 * Keep defaultQualityProfiles emission equivalent to previous rspec-maven-plugin output:
 * - AsciiDoctorConverter.getProfiles(...) extracts profiles (or empty set) from metadata
 *   https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/asciidoctor/AsciiDoctorConverter.java
 * - RuleDataGenerator.execute(...) always writes defaultQualityProfiles back to JSON
 *   https://github.com/SonarSource/rspec-maven-plugin/blob/master/src/main/java/domain/RuleDataGenerator.java
 */
function normalizeDefaultQualityProfiles(metadata: Record<string, unknown>): void {
  const rawProfiles = metadata.defaultQualityProfiles;
  if (!Array.isArray(rawProfiles)) {
    metadata.defaultQualityProfiles = [];
    return;
  }

  const seen = new Set<string>();
  const normalizedProfiles: string[] = [];
  for (const profile of rawProfiles) {
    if (profile == null) {
      continue;
    }
    const profileName = String(profile);
    if (!seen.has(profileName)) {
      seen.add(profileName);
      normalizedProfiles.push(profileName);
    }
  }
  metadata.defaultQualityProfiles = normalizedProfiles;
}

function normalizeRuleKey(key: string): string {
  const trimmed = key.trim();
  if (/^RSPEC-\d+$/.test(trimmed)) {
    return trimmed.replace(/^RSPEC-/, 'S');
  }
  if (/^S\d+$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed)) {
    return `S${trimmed}`;
  }
  throw new Error(`Wrong replacement rule key format: '${key}'. Expected S###, RSPEC-###, or ###.`);
}

/**
 * Keep deprecated/superseded post-processing equivalent to the previous
 * rspec-maven-plugin + sonar-rule-api generation path:
 * - rspec-maven-plugin uses GitHubRuleMaker.getRulesByRuleSubdirectory(...)
 *   https://github.com/SonarSource/rspec-maven-plugin/blob/master/src/main/java/application/ApplicationRuleRepository.java
 * - which applies GitHubRuleMaker.generateDeprecatedSectionAndCorrectStatus(...)
 *   https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/java/com/sonarsource/ruleapi/github/GitHubRuleMaker.java
 */
function generateDeprecatedSectionAndCorrectStatus(
  langSq: string,
  metadata: Record<string, unknown>,
): string {
  const status = String(metadata.status ?? '').toLowerCase();
  const extra = metadata.extra as Record<string, unknown> | undefined;
  const replacements = extra?.replacementRules;

  if (!['deprecated', 'superseded'].includes(status) || !Array.isArray(replacements)) {
    return '';
  }

  let noReplacementDrafted = true;
  const replacementRules: string[] = [];

  for (const replacementRule of replacements) {
    noReplacementDrafted = false;
    const replacementRuleId = normalizeRuleKey(String(replacementRule));
    // In getRulesByRuleSubdirectory mode, every drafted replacement is treated as implemented.
    replacementRules.push(`{rule:${langSq}:${replacementRuleId}}`);
  }

  if (replacementRules.length === 0) {
    if (noReplacementDrafted) {
      return '<p>This rule is deprecated, and will eventually be removed.</p>\n';
    }
    metadata.status = 'ready';
    return '';
  }

  metadata.status = 'deprecated';
  return `<p>This rule is deprecated; use ${replacementRules.join(', ')} instead.</p>\n`;
}

function hasGeneratedRuleData(path: string): boolean {
  if (!existsSync(path)) {
    return false;
  }
  try {
    return readdirSync(path).some(file => /^S\d+\.json$/.test(file));
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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

// SHA file stores the last-synced rspec SHA to detect whether re-sync is needed
const outputDir = join(ROOT_DIR, 'resources', 'rule-data', language);
const shaFile = join(ROOT_DIR, 'resources', 'rule-data', `.synced-sha-${language}`);

// For managed clones, check if rspec has changed since last sync
if (isManagedClone && existsSync(shaFile)) {
  const storedSha = readFileSync(shaFile, 'utf-8').trim();
  const hasOutputData = hasGeneratedRuleData(outputDir);

  // Check remote branch SHA via ls-remote (fast, no clone)
  try {
    const remoteInfo = execFileSync(
      'git',
      ['ls-remote', RSPEC_REPO_SSH, `refs/heads/${RSPEC_BRANCH}`],
      { encoding: 'utf-8' },
    );
    const remoteSha = remoteInfo.split('\t')[0].trim();
    if (remoteSha && remoteSha === storedSha && hasOutputData) {
      console.log(
        `RSPEC ${language} rules are up to date (${remoteSha.slice(0, 8)}), skipping sync`,
      );
      process.exit(0);
    }
    if (remoteSha && remoteSha === storedSha && !hasOutputData) {
      console.log(
        `RSPEC ${language} SHA matches (${remoteSha.slice(0, 8)}) but local rule data is missing, syncing`,
      );
    }
  } catch {
    // If ls-remote fails (e.g. offline), continue with sync
  }
}

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
  execSync('git sparse-checkout set rules shared_content', {
    cwd: rspecPath,
    stdio: 'inherit',
  });
} else if (isManagedClone) {
  // Only auto-fetch for the managed clone, not user-provided paths
  console.log(`Fetching rspec (latest) into ${rspecPath}...`);
  try {
    execSync(`git fetch --depth 1 origin ${RSPEC_BRANCH} && git reset --hard FETCH_HEAD`, {
      cwd: rspecPath,
      stdio: 'inherit',
    });
  } catch {
    console.warn('Warning: Failed to fetch rspec, using existing data');
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
        // Keep diff listings escaped to match sonar-rule-api output:
        // - sonar-rule-api template uses `=content` in listing.html.slim (escaped output).
        //   https://github.com/SonarSource/sonar-rule-api/blob/master/src/main/resources/templates/listing.html.slim
        // Using raw getSource() here injects HTML/JSX inside <pre>, which changes rendered snippets.
        const escapedContent =
          typeof node.getContent === 'function'
            ? node.getContent()
            : node.getSource().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre data-diff-id="${diffId}" data-diff-type="${diffType}">${escapedContent}</pre>`;
      }
    }
    return this.baseConverter.convert(node, transform);
  }
}
asciidoctor.ConverterFactory.register(SonarListingConverter as any, ['html5']);

const langSq = LANGUAGE_SQ[language];
const rulesDir = join(rspecPath, 'rules');

// Clean and recreate output directory
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const ruleRegex = /^S\d+$/;
const ruleDirs = (await readdir(rulesDir)).filter(name => ruleRegex.test(name));

async function syncRule(ruleName: string): Promise<boolean> {
  const languageDir = join(rulesDir, ruleName, language);
  const languageMetadataPath = join(languageDir, 'metadata.json');

  let languageMetadataRaw: string;
  try {
    languageMetadataRaw = await readFile(languageMetadataPath, 'utf-8');
  } catch {
    // Rule doesn't have this language — skip
    return false;
  }
  const languageMetadata = JSON.parse(languageMetadataRaw);

  const parentMetadataPath = join(rulesDir, ruleName, 'metadata.json');
  let parentMetadataRaw: string;
  try {
    parentMetadataRaw = await readFile(parentMetadataPath, 'utf-8');
  } catch {
    console.warn(`Warning: No parent metadata.json for ${ruleName}, skipping`);
    return false;
  }
  const parentMetadata = JSON.parse(parentMetadataRaw);

  // Write merged JSON metadata
  const merged = { ...parentMetadata, ...languageMetadata };
  const deprecatedSection = generateDeprecatedSectionAndCorrectStatus(langSq, merged);
  filterApplicableStandardTags(language, merged);
  normalizeDefaultQualityProfiles(merged);
  const writes: Promise<void>[] = [
    writeFile(join(outputDir, `${ruleName}.json`), JSON.stringify(merged, null, 2) + '\n'),
  ];

  // Render adoc to HTML
  const adocPath = join(languageDir, 'rule.adoc');
  if (await exists(adocPath)) {
    const adocContent = await readFile(adocPath, 'utf-8');

    const html = asciidoctor.convert(adocContent, {
      safe: 'unsafe',
      base_dir: languageDir,
      attributes: { 'attribute-missing': 'warn' },
    }) as string;

    writes.push(
      writeFile(
        join(outputDir, `${ruleName}.html`),
        deprecatedSection + populateLinks(langSq, sanitizeHtml(html)),
      ),
    );
  }

  await Promise.all(writes);
  return true;
}

const results = await Promise.all(ruleDirs.map(syncRule));
const count = results.filter(Boolean).length;

// Read the actual rspec HEAD SHA used for this sync
let usedSha: string | undefined;
try {
  usedSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: rspecPath,
    encoding: 'utf-8',
  }).trim();
} catch {
  // ignore
}

// Store the SHA so future runs can skip if nothing changed
if (isManagedClone && usedSha) {
  try {
    await mkdir(join(ROOT_DIR, 'resources', 'rule-data'), { recursive: true });
    writeFileSync(shaFile, usedSha);
  } catch {
    // Non-fatal — skip will just not work next time
  }
}

// Publish the rspec SHA into the jar resources so it is accessible at runtime
if (usedSha) {
  const jarResourcesDir = join(
    ROOT_DIR,
    'sonar-plugin',
    'javascript-checks',
    'src',
    'main',
    'resources',
  );
  await mkdir(jarResourcesDir, { recursive: true });
  writeFileSync(join(jarResourcesDir, 'rspec.sha'), usedSha + '\n');
}

console.log(
  `Synced ${count} ${language} rules to ${outputDir} (rspec@${usedSha?.slice(0, 8) ?? 'unknown'})`,
);
