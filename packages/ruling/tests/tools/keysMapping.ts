import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * This file is in the sonar-javascript-plugin JAR file
 */
const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'rules.json'), 'utf8'));

const sonarToEslint: Record<string, string> = {};
const eslintToSonar: Record<string, string> = {};

for (const rule of rules) {
  sonarToEslint[extractSonarId(rule)] = rule.eslintKey;
  eslintToSonar[rule.eslintKey] = extractSonarId(rule);
}

function extractSonarId(rule) {
  return rule.ruleKey.split(':')[1];
}

export function getSonarToEslint() {
  return sonarToEslint;
}

export function getEslintToSonar() {
  return eslintToSonar;
}
