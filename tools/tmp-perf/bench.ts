// Temporary perf harness for S5914. Do not commit.
import { Linter, type Rule } from 'eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import * as tsParser from '@typescript-eslint/parser';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { rules as sonarRules } from '../../packages/analysis/src/jsts/rules/plugin-rules.js';
import { clearFileCaches } from '../../packages/analysis/src/jsts/rules/helpers/module.js';
import * as assertions from '../../packages/analysis/src/jsts/rules/helpers/assertions.js';

const repo = process.argv[2];
const onlySonar = process.argv.includes('--only-sonar');
const TEST_RE = /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs|mts|cts)$/;

const timings = new Map<string, number>();
function add(key: string, ms: number) {
  timings.set(key, (timings.get(key) ?? 0) + ms);
}

function timed(name: string, rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    create(context) {
      const t0 = performance.now();
      const listeners = rule.create(context) as Record<string, (...a: unknown[]) => void>;
      add(name, performance.now() - t0);
      const wrapped: Record<string, (...a: unknown[]) => void> = {};
      for (const [k, fn] of Object.entries(listeners)) {
        wrapped[k] = (...args) => {
          const s = performance.now();
          try {
            return fn(...args);
          } finally {
            add(name, performance.now() - s);
          }
        };
      }
      return wrapped;
    },
  };
}

const coreNames = onlySonar
  ? []
  : ['no-unused-vars', 'no-undef', 'no-shadow', 'prefer-const', 'eqeqeq'];
const pluginRules: Record<string, Rule.RuleModule> = {
  'no-trivial-assertions': timed('S5914', sonarRules['no-trivial-assertions'] as Rule.RuleModule),
};
for (const n of coreNames) {
  pluginRules[n] = timed(n, builtinRules.get(n)!);
}
const ruleConfig: Linter.RulesRecord = {};
for (const n of Object.keys(pluginRules)) {
  ruleConfig[`bench/${n}`] = 'error';
}

const linter = new Linter({ configType: 'flat', cwd: repo });
const config: Linter.Config[] = [
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'],
    languageOptions: {
      parser: tsParser as unknown as Linter.Parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { bench: { rules: pluginRules } },
    rules: ruleConfig,
  },
];

const files = execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\n')
  .filter(f => TEST_RE.test(f))
  .map(f => path.join(repo, f));
let issues = 0;
let lines = 0;
const tStart = performance.now();
for (const f of files) {
  const code = readFileSync(f, 'utf8');
  lines += code.split('\n').length;
  clearFileCaches();
  // only present in the assertions.ts cache variant
  (assertions as { clearAssertionCaches?: () => void }).clearAssertionCaches?.();
  const msgs = linter.verify(code, config, { filename: f });
  for (const m of msgs) {
    if (m.fatal) {
      console.error('FATAL', f, m.message);
    } else if (m.ruleId === 'bench/no-trivial-assertions') {
      issues++;
      console.log('S5914', path.relative(repo, f), m.line);
    }
  }
}
console.log(
  `files=${files.length} lines=${lines} total=${(performance.now() - tStart).toFixed(0)}ms`,
);
for (const [k, v] of [...timings].sort((a, b) => b[1] - a[1])) {
  console.log(`${k.padEnd(16)} ${v.toFixed(0)} ms`);
}
console.log(`S5914 issues=${issues}`);
