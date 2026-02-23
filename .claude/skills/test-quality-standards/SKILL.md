---
name: test-quality-standards
description: Provides test quality standards and best practices. Use when writing test cases, creating unit tests, implementing tests, or refining/reviewing test code. Essential for test generation and test refinement phases.
---

# Test Quality Standards for Vibe Bot

When writing or reviewing test cases, follow these standards:

## Core Principles

**Minimal code:** Each test case should be the simplest possible code that demonstrates the pattern. Avoid elaborate setups, complex methods, or unnecessary fields.

**Focused:** One test case per distinct scenario. Don't combine multiple patterns in a single test.

**Brief comments:** Use `// Compliant` or `// Compliant: [2-4 words]`. Avoid lengthy explanations. If a URL reference gives context, use that instead of block comments.

**Integrate into existing methods:** Add new test cases to existing test methods when the scenario belongs there, rather than creating separate methods with full setups.

**Scope-appropriate:** Match test code style to the rule's scope. Tests scope → test-style code (test classes, assertions). Main scope → production-style code. All scope → either is acceptable.

**Follow existing conventions:** Match the patterns, naming, and structure already established in the test file and similar test files.

**No redundancy:** If multiple variations test essentially the same thing, keep the clearest version. Each test must add unique coverage.

## Code Simplicity

- **Only include necessary code**: Each test case should contain only the code needed to trigger the false positive
- **One pattern per test case**: Each test case should cover one distinct FP pattern
- **Use realistic names**: Use realistic variable/function names from the Jira ticket if available

## Comments

- **Keep comments short**: Use `// Compliant` or `// Compliant: [2-4 words]`
- **Avoid lengthy explanations**: If the test case is self-explanatory or a URL gives the needed context, a short annotation is enough
- **Avoid block comments above test cases**: Don't add multi-line `// FP scenario: ...` comments. A brief inline comment suffices
- **Include reference URLs when available**: If a community report link exists, add it as a single-line comment instead of paraphrasing the report

## Structure

- **Integrate into existing methods**: Add new test cases to existing test methods when the scenario belongs there, rather than creating separate test methods
- **Follow existing conventions**: Match the test structure, naming, and annotation patterns already used in the codebase. Refer to the guidance document for details
- **Scope-appropriate code**: Test cases must use code patterns that match the rule's scope. If the scope is "Tests", write test-style code. If "Main", write production-style code. If "All", either is acceptable

## No Redundancy

- **Check for duplicates**: Before finalizing, compare all test cases — new and existing — for identical or near-identical patterns
- **Remove duplicates**: If two test cases test the same scenario, keep the one that was already there or the clearer one
- **Assess test value**: Each test case should add unique coverage, not just noise

## Examples

**Minimal code:**
```csharp
[TestMethod]
public void ForLoop_NoIssue() => builder.AddSnippet("for (int i = 0; i < 10; i++) { }");
```

**Brief comment:**
```javascript
foreach (int x in items) { } // Compliant: collection iteration
```

## Application

1. **During test creation:** Apply these standards from the start
2. **During test refinement:** Review existing tests against these standards and simplify
3. **When reviewing test coverage:** Ensure each test adds unique value without redundancy
