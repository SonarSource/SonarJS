'use strict';

// Minimal reproduction for the SonarCloud JavaScript analyzer crash:
//   java.lang.IllegalArgumentException: Line N is out of range for file <file>.
//   File has N-1 lines.
//   at org.sonar.plugins.javascript.analysis.AnalysisProcessor.saveMetrics
//
// The string literal below contains RAW U+2028 (LINE SEPARATOR) and U+2029
// (PARAGRAPH SEPARATOR) characters -- actual bytes E2 80 A8 / E2 80 A9, not
// escape sequences. Analyses of the containing project started failing around
// 2026-08-28 16:00 UTC with no change on the repository side.

describe('unicode line terminators in a string literal', () => {
  test('raw U+2028 and U+2029 inside a single-quoted string', () => {
    const payload = 'line1\nline2\rline3 line4 end';
    expect(typeof payload).toBe('string');
  });
});
