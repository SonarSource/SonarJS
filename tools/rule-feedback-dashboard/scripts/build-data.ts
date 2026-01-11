import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  RuleData,
  CombinedData,
  DatasetMetadata,
  FeedbackCsvRow,
  FeedbackComment,
  AtlanStats,
  JiraTicket,
} from '../src/types.js';

const DATA_DIR = path.resolve(import.meta.dirname, '../data');
const FEEDBACK_DIR = path.resolve(import.meta.dirname, '../../user-feedback/data');

// Input files
const RSPEC_FILE = path.join(DATA_DIR, 'rspec.json');
const ATLAN_FILE = path.join(DATA_DIR, 'atlan.json');
const JIRA_FILE = path.join(DATA_DIR, 'jira.json');

// Output file
const OUTPUT_FILE = path.join(DATA_DIR, 'combined.json');

function parseCSV<T>(content: string): T[] {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  const rows: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle CSV with quoted fields containing commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row as T);
  }

  return rows;
}

function findAllFeedbackCsvs(): { path: string; name: string }[] {
  if (!fs.existsSync(FEEDBACK_DIR)) {
    console.warn(`Feedback directory not found: ${FEEDBACK_DIR}`);
    return [];
  }

  const files = fs.readdirSync(FEEDBACK_DIR).filter(f => f.endsWith('.csv'));
  if (files.length === 0) {
    console.warn('No feedback CSV files found');
    return [];
  }

  // Return all CSV files with their paths
  return files.map(f => ({
    name: f,
    path: path.join(FEEDBACK_DIR, f),
  }));
}

function loadFeedback(): {
  byRule: Map<string, FeedbackComment[]>;
  csvFiles: string[];
  csvDate: string;
  totalRows: number;
} {
  const feedbackFiles = findAllFeedbackCsvs();
  if (feedbackFiles.length === 0) {
    return { byRule: new Map(), csvFiles: [], csvDate: '', totalRows: 0 };
  }

  console.log(`Loading feedback from ${feedbackFiles.length} CSV files:`);
  feedbackFiles.forEach(f => console.log(`  - ${f.name}`));

  let allRows: FeedbackCsvRow[] = [];

  for (const feedbackFile of feedbackFiles) {
    const content = fs.readFileSync(feedbackFile.path, 'utf-8');
    const rows = parseCSV<FeedbackCsvRow>(content);
    allRows = allRows.concat(rows);
  }

  console.log(`Total rows loaded: ${allRows.length}`);

  // Filter for JS/TS rules only
  const jstsRows = allRows.filter(
    r =>
      r.ruleRepository === 'javascript' ||
      r.ruleRepository === 'typescript' ||
      r.language === 'js' ||
      r.language === 'ts',
  );

  console.log(`Filtered ${jstsRows.length} JS/TS feedback entries from ${allRows.length} total`);

  const byRule = new Map<string, FeedbackComment[]>();

  for (const row of jstsRows) {
    const ruleKey = row.ruleKey;
    if (!ruleKey) continue;

    if (!byRule.has(ruleKey)) {
      byRule.set(ruleKey, []);
    }

    byRule.get(ruleKey)!.push({
      comment: row.comment || '',
      date: row.feedbackDate || row.creationDate || '',
      resolution: row.resolution || '',
      fileUrl: row.fileUrl || '',
      fileName: row.fileName || '',
      issueUrl: row.issueUrl || '',
      line: row.line ? parseInt(row.line, 10) : null,
      projectKey: row.projectKey || '',
    });
  }

  // Get current date for tracking
  const csvDate = new Date().toISOString().split('T')[0];
  const csvFileNames = feedbackFiles.map(f => f.name);

  return { byRule, csvFiles: csvFileNames, csvDate, totalRows: allRows.length };
}

interface RspecData {
  processedAt: string;
  totalRules: number;
  rules: Array<{
    ruleKey: string;
    title: string;
    type: string;
    severity: string;
    tags: string[];
    status: string;
    languages: string[];
    scope: string;
    quickfix: string;
    sonarWay: boolean;
  }>;
}

interface AtlanData {
  fetchedAt: string;
  sourceFile: string;
  sourceDate: string;
  rules: Record<string, { js?: AtlanStats; ts?: AtlanStats }>;
}

interface JiraData {
  fetchedAt: string;
  rules: Record<string, JiraTicket[]>;
}

function loadRspec(): RspecData | null {
  if (!fs.existsSync(RSPEC_FILE)) {
    console.warn('RSPEC file not found. Run: npm run process-rspec');
    return null;
  }
  return JSON.parse(fs.readFileSync(RSPEC_FILE, 'utf-8'));
}

function loadAtlan(): AtlanData | null {
  if (!fs.existsSync(ATLAN_FILE)) {
    console.warn('Atlan file not found. Run: npm run fetch-atlan');
    return null;
  }
  return JSON.parse(fs.readFileSync(ATLAN_FILE, 'utf-8'));
}

function loadJira(): JiraData | null {
  if (!fs.existsSync(JIRA_FILE)) {
    console.warn('Jira file not found. Run: npm run fetch-jira');
    return null;
  }
  return JSON.parse(fs.readFileSync(JIRA_FILE, 'utf-8'));
}

function combineAtlanStats(entry: { js?: AtlanStats; ts?: AtlanStats }): AtlanStats | null {
  if (!entry.js && !entry.ts) return null;

  if (entry.js && entry.ts) {
    // Combine JS and TS stats
    return {
      ruleName: entry.js.ruleName || entry.ts.ruleName,
      acceptCount: entry.js.acceptCount + entry.ts.acceptCount,
      acceptPercent: (entry.js.acceptPercent + entry.ts.acceptPercent) / 2,
      fpCount: entry.js.fpCount + entry.ts.fpCount,
      fpPercent: (entry.js.fpPercent + entry.ts.fpPercent) / 2,
      fixedCount: entry.js.fixedCount + entry.ts.fixedCount,
      fixedPercent: (entry.js.fixedPercent + entry.ts.fixedPercent) / 2,
      removedCount: entry.js.removedCount + entry.ts.removedCount,
      removedPercent: (entry.js.removedPercent + entry.ts.removedPercent) / 2,
      netValue: entry.js.netValue + entry.ts.netValue,
      netRatio: (entry.js.netRatio + entry.ts.netRatio) / 2,
      netNegative: entry.js.netNegative + entry.ts.netNegative,
      resolvedCount: entry.js.resolvedCount + entry.ts.resolvedCount,
      resolvedPercent: (entry.js.resolvedPercent + entry.ts.resolvedPercent) / 2,
      issuesCount: entry.js.issuesCount + entry.ts.issuesCount,
      projectsCount: entry.js.projectsCount + entry.ts.projectsCount,
      projectsPercent: (entry.js.projectsPercent + entry.ts.projectsPercent) / 2,
    };
  }

  return entry.js || entry.ts || null;
}

function buildCombinedData(): void {
  console.log('Building combined data...');

  const rspec = loadRspec();
  const atlan = loadAtlan();
  const jira = loadJira();
  const feedback = loadFeedback();

  if (!rspec) {
    console.error('RSPEC data is required. Run: npm run process-rspec');
    process.exit(1);
  }

  const rules: RuleData[] = [];
  let rulesWithFeedback = 0;
  let rulesWithJiraTickets = 0;

  for (const rspecRule of rspec.rules) {
    const ruleKey = rspecRule.ruleKey;

    // Get feedback
    const feedbackComments = feedback.byRule.get(ruleKey) || [];
    const fpCount = feedbackComments.filter(c => c.resolution === 'FALSE-POSITIVE').length;
    const wontfixCount = feedbackComments.filter(c => c.resolution === 'WONTFIX').length;

    // Get Atlan stats
    const atlanEntry = atlan?.rules[ruleKey];
    const atlanStats = atlanEntry ? combineAtlanStats(atlanEntry) : null;
    const atlanByLang = atlanEntry ? { js: atlanEntry.js, ts: atlanEntry.ts } : undefined;

    // Get Jira tickets
    const jiraTickets = jira?.rules[ruleKey] || [];

    // Determine language
    let language: 'js' | 'ts' | 'both' = 'both';
    if (atlanEntry) {
      if (atlanEntry.js && !atlanEntry.ts) language = 'js';
      else if (!atlanEntry.js && atlanEntry.ts) language = 'ts';
    }

    if (feedbackComments.length > 0) rulesWithFeedback++;
    if (jiraTickets.length > 0) rulesWithJiraTickets++;

    rules.push({
      ruleKey,
      title: rspecRule.title,
      type: rspecRule.type,
      severity: rspecRule.severity,
      tags: rspecRule.tags,
      language,
      scope: rspecRule.scope,
      quickfix: rspecRule.quickfix,
      sonarWay: rspecRule.sonarWay,
      feedbackCount: feedbackComments.length,
      fpCount,
      wontfixCount,
      feedbackComments,
      atlan: atlanStats,
      atlanByLang,
      jiraTicketCount: jiraTickets.length,
      jiraTickets,
    });
  }

  // Sort by feedback count (descending)
  rules.sort((a, b) => b.feedbackCount - a.feedbackCount);

  const metadata: DatasetMetadata = {
    feedbackCsvFiles: feedback.csvFiles,
    feedbackCsvDate: feedback.csvDate,
    feedbackTotalRows: feedback.totalRows,
    atlanCsvDate: atlan?.sourceDate || '',
    jiraFetchDate: jira?.fetchedAt?.split('T')[0] || '',
    rspecProcessedDate: rspec.processedAt.split('T')[0],
    totalRules: rules.length,
    rulesWithFeedback,
    rulesWithJiraTickets,
  };

  const combined: CombinedData = { metadata, rules };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2));
  console.log(`\nWrote combined data to ${OUTPUT_FILE}`);
  console.log(`  Total rules: ${rules.length}`);
  console.log(`  Rules with feedback: ${rulesWithFeedback}`);
  console.log(`  Rules with Jira tickets: ${rulesWithJiraTickets}`);
}

buildCombinedData();
