import * as fs from 'fs';
import * as path from 'path';
import { valid } from 'semver';
import { configs, rules, meta } from 'eslint-plugin-sonarjs';

const existingRules = Object.keys(rules);

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
