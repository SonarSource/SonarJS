import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { JiraTicket } from '../src/types.js';

const OUTPUT_FILE = path.resolve(import.meta.dirname, '../data/jira.json');

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
  };
}

function extractRuleKeys(text: string): string[] {
  const matches = text.match(/S\d+/g);
  return matches ? [...new Set(matches)] : [];
}

function getSixMonthsAgo(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date.toISOString().split('T')[0];
}

async function fetchJira(): Promise<void> {
  console.log('Fetching Jira tickets from JS project...');

  // Query: JS project, created in last 6 months
  const sixMonthsAgo = getSixMonthsAgo();
  const jql = `project = JS AND created >= ${sixMonthsAgo} ORDER BY created DESC`;

  const cmd = `acli jira workitem search --jql "${jql}" --json --limit 500`;
  console.log(`Running: ${cmd}`);

  let output: string;
  try {
    output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  } catch (err) {
    console.error('Failed to fetch Jira tickets. Make sure acli is authenticated.');
    console.error('Run: acli jira auth');
    process.exit(1);
  }

  let issues: JiraIssue[];
  try {
    issues = JSON.parse(output);
  } catch {
    console.error('Failed to parse Jira response as JSON');
    console.error('Output:', output.slice(0, 500));
    process.exit(1);
  }

  console.log(`Fetched ${issues.length} issues`);

  // Extract rule keys from each issue
  const ruleMap = new Map<string, JiraTicket[]>();

  for (const issue of issues) {
    const summary = issue.fields?.summary || '';
    const ruleKeys = extractRuleKeys(summary);

    // Also check issue key itself (some tickets are named like "JS-1234 S100")
    const keyRules = extractRuleKeys(issue.key);
    const allRules = [...new Set([...ruleKeys, ...keyRules])];

    const ticket: JiraTicket = {
      key: issue.key,
      summary: summary,
      status: issue.fields?.status?.name || 'Unknown',
    };

    for (const ruleKey of allRules) {
      if (!ruleMap.has(ruleKey)) {
        ruleMap.set(ruleKey, []);
      }
      ruleMap.get(ruleKey)!.push(ticket);
    }
  }

  // Count tickets without rule keys (for info)
  const ticketsWithoutRules = issues.filter(i => {
    const summary = i.fields?.summary || '';
    return extractRuleKeys(summary).length === 0 && extractRuleKeys(i.key).length === 0;
  });

  console.log(`Found ${ruleMap.size} rules with tickets`);
  console.log(`${ticketsWithoutRules.length} tickets have no rule key in summary`);

  const output_data = {
    fetchedAt: new Date().toISOString(),
    totalIssues: issues.length,
    rulesWithTickets: ruleMap.size,
    ticketsWithoutRuleKey: ticketsWithoutRules.length,
    rules: Object.fromEntries(ruleMap),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output_data, null, 2));
  console.log(`Wrote to ${OUTPUT_FILE}`);
}

fetchJira();
