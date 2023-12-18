import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * This file is in the sonar-javascript-plugin JAR file
 */
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'sonarlint-metadata.json'), 'utf8'));

const sonarToEslint: Record<string, string> = {};
const eslintToSonar: Record<string, string> = {};

for (const rule of rules) {
  sonarToEslint[extractSonarId(rule)] = rule.eslintKey;
  eslintToSonar[rule.eslintKey] = extractSonarId(rule);
}

function extractSonarId(rule: any) {
  return rule.ruleKey.split(':')[1];
}

fs.writeFileSync(
  path.join(__dirname, 'sonar-to-eslint-id.json'),
  JSON.stringify(sonarToEslint, null, 2),
);
fs.writeFileSync(
  path.join(__dirname, 'eslint-to-sonar-id.json'),
  JSON.stringify(eslintToSonar, null, 2),
);
