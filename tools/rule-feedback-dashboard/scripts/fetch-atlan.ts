import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { AtlanCsvRow, AtlanStats } from '../src/types.js';

const OUTPUT_FILE = path.resolve(import.meta.dirname, '../data/atlan.json');
const REPO = 'SonarSource/sonar-vibe-bot';
const DATA_PATH = 'jsts/issue-data/data';

function parseCSV(content: string): AtlanCsvRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const rows: AtlanCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row as unknown as AtlanCsvRow);
  }

  return rows;
}

function rowToStats(row: AtlanCsvRow): AtlanStats {
  return {
    ruleName: row.rule_name,
    acceptCount: parseInt(row.accept_count, 10) || 0,
    acceptPercent: parseFloat(row.accept_percent) || 0,
    fpCount: parseInt(row.fp_count, 10) || 0,
    fpPercent: parseFloat(row.fp_percent) || 0,
    fixedCount: parseInt(row.fixed_count, 10) || 0,
    fixedPercent: parseFloat(row.fixed_percent) || 0,
    removedCount: parseInt(row.removed_count, 10) || 0,
    removedPercent: parseFloat(row.removed_percent) || 0,
    netValue: parseInt(row.net_value, 10) || 0,
    netRatio: parseFloat(row.net_ratio) || 0,
    netNegative: parseInt(row.net_negative, 10) || 0,
    resolvedCount: parseInt(row.resolved_count, 10) || 0,
    resolvedPercent: parseFloat(row.resolved_percent) || 0,
    issuesCount: parseInt(row.issues_count, 10) || 0,
    projectsCount: parseInt(row.projects_count, 10) || 0,
    projectsPercent: parseFloat(row.projects_percent) || 0,
  };
}

async function fetchAtlan(): Promise<void> {
  console.log('Fetching Atlan data from sonar-vibe-bot...');

  // List files in the data directory to find the latest CSV
  const listCmd = `gh api repos/${REPO}/contents/${DATA_PATH} --jq '.[].name'`;
  console.log(`Running: ${listCmd}`);

  let fileList: string;
  try {
    fileList = execSync(listCmd, { encoding: 'utf-8' });
  } catch (err) {
    console.error('Failed to list files. Make sure gh is authenticated.');
    process.exit(1);
  }

  // Find the latest dated CSV file (format: YYYYMMDD.csv)
  const csvFiles = fileList
    .trim()
    .split('\n')
    .filter(f => /^\d{8}\.csv$/.test(f))
    .sort()
    .reverse();

  if (csvFiles.length === 0) {
    console.error('No CSV files found in repo');
    process.exit(1);
  }

  const latestFile = csvFiles[0];
  const dateStr = latestFile.replace('.csv', '');
  console.log(`Latest file: ${latestFile}`);

  // Fetch the CSV content
  const fetchCmd = `gh api repos/${REPO}/contents/${DATA_PATH}/${latestFile} --jq '.content' | base64 -d`;
  console.log(`Fetching: ${latestFile}`);

  let csvContent: string;
  try {
    csvContent = execSync(fetchCmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    console.error('Failed to fetch CSV content');
    process.exit(1);
  }

  // Parse CSV
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} rows`);

  // Filter for JavaScript and TypeScript rules
  const jstsRows = rows.filter(
    r => r.plugin_name === 'javascript' || r.plugin_name === 'typescript',
  );
  console.log(`Filtered to ${jstsRows.length} JS/TS rows`);

  // Group by rule key, combining JS and TS stats
  const ruleMap = new Map<string, { js?: AtlanStats; ts?: AtlanStats }>();

  for (const row of jstsRows) {
    const ruleKey = row.plugin_rule_key;
    if (!ruleMap.has(ruleKey)) {
      ruleMap.set(ruleKey, {});
    }
    const entry = ruleMap.get(ruleKey)!;
    if (row.plugin_name === 'javascript') {
      entry.js = rowToStats(row);
    } else {
      entry.ts = rowToStats(row);
    }
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    sourceFile: latestFile,
    sourceDate: dateStr,
    totalRows: jstsRows.length,
    rules: Object.fromEntries(ruleMap),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${ruleMap.size} rules to ${OUTPUT_FILE}`);
}

fetchAtlan();
