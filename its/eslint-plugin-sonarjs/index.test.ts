import * as fs from 'fs';
import * as path from 'path';
import { valid } from 'semver';
import { configs, rules, meta } from 'eslint-plugin-sonarjs';

const rulesPath = path.join(__dirname, '../src/rules');
const existingRules = fs.readdirSync(rulesPath).map(file => file.substring(0, file.indexOf('.ts')));

describe('eslint-plugin-sonarjs', () => {
  it('should declare all rules in recommended config', () => {
    existingRules.forEach(rule => {
      expect(configs.recommended.rules).toHaveProperty(`sonarjs/${rule}`);
    });
    expect(Object.keys(configs.recommended.rules!)).toHaveLength(existingRules.length);
    expect(new Set(Object.values(configs.recommended.rules!))).toEqual(new Set(['off', 'error']));
    existingRules.forEach(rule => {
      expect(configs.recommended.plugins!['sonarjs'].rules).toHaveProperty(rule);
    });
  });

  it('should declare all rules', () => {
    existingRules.forEach(rule => {
      expect(rules).toHaveProperty(rule);
    });
    expect(Object.keys(rules)).toHaveLength(existingRules.length);
  });

  it('should document all rules', () => {
    const root = path.join(__dirname, '../');
    const README = fs.readFileSync(`${root}/README.md`, 'utf8');
    existingRules.forEach(rule => {
      expect(README.includes(rule)).toBe(true);
      expect(fs.existsSync(`${root}/docs/rules/${rule}.md`)).toBe(true);
      expect(rules![rule as keyof typeof rules].meta.docs!.url).toBe(
        `https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/${rule}.md`,
      );
    });
  });

  it('should export legacy config', () => {
    const legacyConfig = configs['recommended-legacy'];
    expect(legacyConfig.plugins).toEqual(['sonarjs']);
    expect(legacyConfig.rules).toEqual(configs.recommended.rules);
  });

  it('should export meta', () => {
    expect(meta.name).toEqual('eslint-plugin-sonarjs');
    expect(valid(meta.version)).toBeTruthy();
  });
});
