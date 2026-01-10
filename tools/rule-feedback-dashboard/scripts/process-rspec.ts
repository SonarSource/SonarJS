import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RspecJson } from '../src/types.js';

const RSPEC_DIR = path.resolve(
  import.meta.dirname,
  '../../../sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript',
);
const OUTPUT_FILE = path.resolve(import.meta.dirname, '../data/rspec.json');

interface RspecData {
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
}

function processRspec(): void {
  console.log(`Reading RSPEC files from: ${RSPEC_DIR}`);

  const files = fs.readdirSync(RSPEC_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('S'));

  const rules: RspecData[] = [];

  for (const file of jsonFiles) {
    const ruleKey = file.replace('.json', '');
    const filePath = path.join(RSPEC_DIR, file);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const json: RspecJson = JSON.parse(content);

      rules.push({
        ruleKey,
        title: json.title || '',
        type: json.type || 'CODE_SMELL',
        severity: json.defaultSeverity || 'Minor',
        tags: json.tags || [],
        status: json.status || 'ready',
        languages: json.compatibleLanguages || ['js', 'ts'],
        scope: json.scope || 'Main',
        quickfix: json.quickfix || 'unknown',
        sonarWay: (json.defaultQualityProfiles || []).includes('Sonar way'),
      });
    } catch (err) {
      console.error(`Error reading ${file}:`, err);
    }
  }

  // Sort by rule key numerically
  rules.sort((a, b) => {
    const numA = parseInt(a.ruleKey.slice(1), 10);
    const numB = parseInt(b.ruleKey.slice(1), 10);
    return numA - numB;
  });

  const output = {
    processedAt: new Date().toISOString(),
    totalRules: rules.length,
    rules,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${rules.length} rules to ${OUTPUT_FILE}`);
}

processRspec();
