#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const expectedDir = 'its/ruling/src/test/expected/jsts';
const actualDir = 'packages/ruling/actual/jsts';

const stats = {
  overall: { expected: 0, actual: 0, diff: 0, newIssues: 0, removedIssues: 0 },
  byProject: {},
  byRule: {},
  mismatches: [],
};

function countIssues(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Object.values(content).reduce((sum, lines) => sum + lines.length, 0);
  } catch (e) {
    return 0;
  }
}

function getAllJsonFiles(dir) {
  const files = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Get all expected files
const expectedFiles = getAllJsonFiles(expectedDir);

console.log(`Found ${expectedFiles.length} files in expected directory`);
console.log('Comparing expected vs actual...\n');

for (const expectedFile of expectedFiles) {
  // Parse file path
  const relativePath = path.relative(expectedDir, expectedFile);
  const match = relativePath.match(/([^/]+)\/(javascript|typescript)-([^.]+)\.json/);

  if (!match) continue;

  const [, project, lang, rule] = match;

  // Corresponding actual file
  const actualFile = path.join(actualDir, relativePath);

  const expectedCount = countIssues(expectedFile);
  const actualCount = countIssues(actualFile);
  const diff = actualCount - expectedCount;

  // Overall stats
  stats.overall.expected += expectedCount;
  stats.overall.actual += actualCount;
  stats.overall.diff += diff;

  if (diff > 0) {
    stats.overall.newIssues += diff;
  } else if (diff < 0) {
    stats.overall.removedIssues += Math.abs(diff);
  }

  // Track mismatches
  if (diff !== 0) {
    stats.mismatches.push({
      project,
      lang,
      rule,
      expected: expectedCount,
      actual: actualCount,
      diff,
    });
  }

  // By project
  if (!stats.byProject[project]) {
    stats.byProject[project] = {
      expected: 0,
      actual: 0,
      diff: 0,
      newIssues: 0,
      removedIssues: 0,
      rules: {},
    };
  }

  stats.byProject[project].expected += expectedCount;
  stats.byProject[project].actual += actualCount;
  stats.byProject[project].diff += diff;

  if (diff > 0) {
    stats.byProject[project].newIssues += diff;
  } else if (diff < 0) {
    stats.byProject[project].removedIssues += Math.abs(diff);
  }

  if (!stats.byProject[project].rules[rule]) {
    stats.byProject[project].rules[rule] = { expected: 0, actual: 0, diff: 0 };
  }
  stats.byProject[project].rules[rule].expected += expectedCount;
  stats.byProject[project].rules[rule].actual += actualCount;
  stats.byProject[project].rules[rule].diff += diff;

  // By rule
  if (!stats.byRule[rule]) {
    stats.byRule[rule] = {
      expected: 0,
      actual: 0,
      diff: 0,
      newIssues: 0,
      removedIssues: 0,
      projects: {},
    };
  }

  stats.byRule[rule].expected += expectedCount;
  stats.byRule[rule].actual += actualCount;
  stats.byRule[rule].diff += diff;

  if (diff > 0) {
    stats.byRule[rule].newIssues += diff;
  } else if (diff < 0) {
    stats.byRule[rule].removedIssues += Math.abs(diff);
  }

  if (!stats.byRule[rule].projects[project]) {
    stats.byRule[rule].projects[project] = { expected: 0, actual: 0, diff: 0 };
  }
  stats.byRule[rule].projects[project].expected += expectedCount;
  stats.byRule[rule].projects[project].actual += actualCount;
  stats.byRule[rule].projects[project].diff += diff;
}

// Print results
console.log('='.repeat(80));
console.log('OVERALL STATISTICS');
console.log('='.repeat(80));
console.log(`Total issues in EXPECTED:  ${stats.overall.expected}`);
console.log(`Total issues in ACTUAL:    ${stats.overall.actual}`);
console.log(
  `Net difference:            ${stats.overall.diff >= 0 ? '+' : ''}${stats.overall.diff}`,
);
console.log('');
console.log(
  `NEW issues in actual:      ${stats.overall.newIssues} ${stats.overall.newIssues > 0 ? '❌' : '✓'}`,
);
console.log(
  `Removed issues in actual:  ${stats.overall.removedIssues} ${stats.overall.removedIssues > 0 ? '⚠️' : '✓'}`,
);
console.log('');

if (stats.overall.diff !== 0) {
  console.log(`⚠️  FILES DO NOT MATCH!`);
  console.log(`    Expected and actual folders have different issue counts.`);
  console.log(`    Total mismatched files: ${stats.mismatches.length}`);
} else {
  console.log('✓ All files match! Expected and actual are identical.');
}
console.log('');

// Show top mismatches
if (stats.mismatches.length > 0) {
  console.log('='.repeat(80));
  console.log('TOP 20 MISMATCHES (by absolute difference)');
  console.log('='.repeat(80));

  const topMismatches = stats.mismatches
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 20);

  for (const m of topMismatches) {
    const sign = m.diff > 0 ? '+' : '';
    const indicator = m.diff > 0 ? '❌' : '⚠️';
    console.log(
      `${indicator} ${m.project}/${m.lang}-${m.rule}.json: expected ${m.expected}, actual ${m.actual} (${sign}${m.diff})`,
    );
  }
  console.log('');
}

console.log('='.repeat(80));
console.log('BREAKDOWN BY RULE');
console.log('='.repeat(80));

const rulesSorted = Object.entries(stats.byRule)
  .filter(([, data]) => data.diff !== 0)
  .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff));

if (rulesSorted.length === 0) {
  console.log('\n✓ All rules match perfectly!\n');
} else {
  for (const [rule, data] of rulesSorted) {
    const sign = data.diff >= 0 ? '+' : '';
    const indicator = data.diff > 0 ? '❌' : '⚠️';

    console.log(`\n${indicator} ${rule}:`);
    console.log(`  Expected: ${data.expected}`);
    console.log(`  Actual:   ${data.actual}`);
    console.log(`  Diff:     ${sign}${data.diff}`);

    if (data.newIssues > 0) {
      console.log(`  New issues: ${data.newIssues}`);
    }
    if (data.removedIssues > 0) {
      console.log(`  Removed issues: ${data.removedIssues}`);
    }

    // Show affected projects
    const affectedProjects = Object.entries(data.projects)
      .filter(([, p]) => p.diff !== 0)
      .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))
      .slice(0, 5);

    if (affectedProjects.length > 0) {
      console.log(`  Affected projects:`);
      for (const [proj, projData] of affectedProjects) {
        const projSign = projData.diff >= 0 ? '+' : '';
        console.log(
          `    ${proj}: ${projData.expected} → ${projData.actual} (${projSign}${projData.diff})`,
        );
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('BREAKDOWN BY PROJECT');
console.log('='.repeat(80));

const projectsSorted = Object.entries(stats.byProject)
  .filter(([, data]) => data.diff !== 0)
  .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff));

if (projectsSorted.length === 0) {
  console.log('\n✓ All projects match perfectly!\n');
} else {
  for (const [project, data] of projectsSorted) {
    const sign = data.diff >= 0 ? '+' : '';
    const indicator = data.diff > 0 ? '❌' : '⚠️';

    console.log(`\n${indicator} ${project}:`);
    console.log(`  Expected: ${data.expected}`);
    console.log(`  Actual:   ${data.actual}`);
    console.log(`  Diff:     ${sign}${data.diff}`);

    if (data.newIssues > 0) {
      console.log(`  New issues: ${data.newIssues}`);
    }
    if (data.removedIssues > 0) {
      console.log(`  Removed issues: ${data.removedIssues}`);
    }

    // Show affected rules
    const affectedRules = Object.entries(data.rules)
      .filter(([, r]) => r.diff !== 0)
      .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))
      .slice(0, 5);

    if (affectedRules.length > 0) {
      console.log(`  Affected rules:`);
      for (const [r, rData] of affectedRules) {
        const rSign = rData.diff >= 0 ? '+' : '';
        console.log(`    ${r}: ${rData.expected} → ${rData.actual} (${rSign}${rData.diff})`);
      }
    }
  }
}

console.log('');

// Summary
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total rules analyzed: ${Object.keys(stats.byRule).length}`);
console.log(`Rules with differences: ${rulesSorted.length}`);
console.log(`Total projects analyzed: ${Object.keys(stats.byProject).length}`);
console.log(`Projects with differences: ${projectsSorted.length}`);
console.log(`Total mismatched files: ${stats.mismatches.length}`);
console.log('');

if (stats.overall.diff === 0) {
  console.log('✅ SUCCESS: Expected and actual results match perfectly!');
} else if (stats.overall.newIssues > 0) {
  console.log('❌ FAILURE: Actual has MORE issues than expected (regression detected)');
  console.log(`   ${stats.overall.newIssues} new issues need to be investigated`);
} else {
  console.log('⚠️  WARNING: Actual has FEWER issues than expected');
  console.log(`   ${stats.overall.removedIssues} issues are no longer detected`);
}
console.log('');
