# User Feedback Report - JS/TS Rules (Condensed)

**Generated:** 2026-01-09 09:40

## Summary (FP >= 3)

| Rule  |  FP | WONTFIX | Total |
| ----- | --: | ------: | ----: |
| S7739 |  36 |       0 |    36 |
| S2699 |  25 |       0 |    25 |
| S6747 |  20 |       1 |    21 |
| S4325 |  20 |       0 |    20 |
| S7781 |  18 |       6 |    24 |
| S6582 |  18 |       6 |    24 |
| S6774 |  16 |       0 |    16 |
| S7764 |  15 |      10 |    25 |
| S7785 |  13 |       6 |    19 |
| S2004 |  12 |       5 |    17 |
| S2486 |  11 |       1 |    12 |
| S1848 |  11 |       0 |    11 |
| S3735 |  10 |       2 |    12 |
| S7780 |   9 |       1 |    10 |
| S6437 |   9 |       1 |    10 |
| S7763 |   7 |       1 |     8 |
| S6478 |   7 |       0 |     7 |
| S6748 |   6 |       1 |     7 |
| S4335 |   6 |       0 |     6 |
| S4123 |   5 |       0 |     5 |
| S7735 |   4 |       2 |     6 |
| S6819 |   4 |       1 |     5 |
| S7770 |   4 |       0 |     4 |
| S7740 |   4 |       0 |     4 |
| S6848 |   4 |       0 |     4 |
| S6759 |   4 |       0 |     4 |
| S3776 |   3 |       6 |     9 |
| S1135 |   3 |       4 |     7 |
| S7776 |   3 |       1 |     4 |
| S6853 |   3 |       1 |     4 |
| S4782 |   3 |       1 |     4 |
| S6861 |   3 |       0 |     3 |
| S6859 |   3 |       0 |     3 |
| S6767 |   3 |       0 |     3 |
| S6754 |   3 |       0 |     3 |
| S6660 |   3 |       0 |     3 |
| S6544 |   3 |       0 |     3 |
| S6440 |   2 |       3 |     5 |
| S7648 |   1 |       8 |     9 |
| S125  |   0 |       3 |     3 |

---

## Key Feedback (2-3 examples per rule)

### S7739 (44 FP)

- "this is Yup validation syntax"
- "this is Yup validation syntax"
- "This is a pipeline stage if then"

### S2699 (26 FP)

- "The test includes an assertion using `expect` function."
- "The test includes an assertion using `expect` function."
- "The test includes an assertion using `expect` function."

### S6747 (22 FP)

- "{/_ eslint-disable-next-line react/no-unknown-property _/} {/\* SonarQube: jsx is a valid prop for Next.j..."
- "{/_ eslint-disable-next-line react/no-unknown-property _/} {/\* SonarQube: jsx is a valid prop for Next.j..."
- "{/_ SonarQube: jsx and global are valid props for Next.js styled-jsx _/}"

### S4325 (34 FP)

- "canvasElement.parentElement could be null and within does not accept null"
- "It does not accept undefined."
- "The receiver does not accept a string | null hence the unwrapping is necessary here."

### S7781 (25 FP)

- "`replaceAll` is not available on all devices that we are targeting."
- "The escapeHtml function uses .replace() with global regex /g flag which is functionally identical to .replaceAll(). This..."
- "We need to check the replaceAll on the node version"

### S6582 (18 FP)

- "not available in node 12"
- "The suggested change does not improve legibility."
- "Outside the path of this change."

### S6774 (18 FP)

- "React 19 deprecated propTypes specifically on forwardRef components (ForwardRefExoticComponent)."
- "React 19 deprecated propTypes specifically on forwardRef components (ForwardRefExoticComponent)."
- "React 19 deprecated propTypes specifically on forwardRef components (ForwardRefExoticComponent)."

### S7764 (21 FP)

- "Not working in our setup"
- "Not working in our setup"
- "This is the odoo syntax"

### S7785 (17 FP)

- "The current code is correct for CommonJS; the linter is enforcing an ESM pattern that doesn't apply here. Nest uses comm..."
- "Not possible in this context."
- "False positive. This is not a promise. But a fallback for a Zod validation schema"

### S2004 (17 FP)

- "these are arrow functions in tests. not needed to fix."
- "this is a test file and nesting here is expected"
- "the nesting level is not important in the test files"

### S2486 (12 FP)

- "It is handled by returning the url"
- "This is handled by AuthLogger.warn(...) in order to warn user"
- "Analysis is mistaken. The exception is correctly handled in this.failed(...) method. The goal is to show to end user the..."

### S1848 (12 FP)

- "This function is used for GoogleTranslate in the master page."
- "This is CDK code where we instantiate resources."
- "This function is used in the master page with the Google Translate script inclusion."

### S3735 (12 FP)

- "The `void` operator is used here to explicitly indicate an intentionally unhandled (lingering) promise."
- "The `void` operator is used here to explicitly indicate an intentionally unhandled (lingering) promise."
- "The `void` operator is used here to explicitly indicate an intentionally unhandled (lingering) promise."

### S7780 (12 FP)

- "make the code longer while not improving readability that much"
- "will make it longer and harder to read"
- "will make it lnger and harder to read"

### S6437 (13 FP)

- "It's literally a test secret in a test file"
- "That's not a PW but the algorithm."
- "justru ini buat verify request nya. ahh"

### S7763 (12 FP)

- "The functions are used in the code"
- "The functions are used in the code"
- "matches the convention of the other exports"

### S6478 (8 FP)

- "This is a standard pattern for react-day-picker component customization. The WeekNumber component is a simple wrapper th..."
- "This is a standard pattern for react-day-picker component customization. The 'components' prop accepts inline component ..."
- "I already fixed this but the warning would not go away on subsequent runs"

### S6748 (6 FP)

- "this is required for the tanstack form library"
- "This is needed to access the field value. See documentation here https://tanstack.com/form/v1/docs/framework/react/guide..."
- "This is needed to access the field value. See documentation here https://tanstack.com/form/v1/docs/framework/react/guide..."

### S4335 (14 FP)

- "This is a legitimate way to collapse a string union in this one specific scenario of providing a loose autocomplete type..."
- "This is an auto-generated file. We aren't going to go through these with a fine tooth comb"
- "`(string | {})` is a completely valid TypeScript technique"

### S4123 (5 FP)

- "The function IS async and DOES await multiple operations."
- "The function IS async and DOES await multiple operations."
- "The function IS async and DOES await multiple operations."

---

**S3 Bucket:** `488059965635-issuefeedback-reports-eu-central-1-prod-rep`
**Full report:** `feedback-report-*.md`
