# Developer Guide

## Prerequisites

- [JDK 11](https://docs.aws.amazon.com/corretto/latest/corretto-11-ug/what-is-corretto-11.html)
- [Maven](https://maven.apache.org/install.html)
- Node.js (we recommend using [NVM](https://github.com/nvm-sh/nvm#installing-and-updating))

You can also use Docker container defined in `./.cirrus/nodejs-lts.Dockerfile` which bundles all required dependencies and is used for our CI pipeline.

## Build and run unit tests

To build the plugin and run its unit tests, execute this command from the project's root directory:

```sh
npm run build-full
```

## Integration Tests

First make sure the submodules are checked out:

```sh
 git submodule init
 git submodule update
```

### Plugin Tests

The "Plugin Test" is an integration test which verifies plugin features such as metric calculation, coverage etc.

```sh
cd its/plugin
mvn clean install
```

### Ruling Tests

The "Ruling Test" is an integration test which launches the analysis of a large code base (stored as submodules), saves the issues created by the plugin in report files, and then compares those results to the set of expected issues (stored as JSON files).

```sh
cd its/ruling
mvn verify -Dtest=JavaScriptRulingTest -Dmaven.test.redirectTestOutputToFile=false
mvn verify -Dtest=TypeScriptRulingTest -Dmaven.test.redirectTestOutputToFile=false
mvn verify -Dtest=CssRulingTest -Dmaven.test.redirectTestOutputToFile=false
```

This test gives you the opportunity to examine the issues created by each rule and make sure that they are what you expect. You can inspect new/lost issues checking the SonarQube UI (use DEBUG mode and put a breakpoint on the assertion) at the end of analysis.

If everything looks good to you, you can copy the file with the actual issues located at `its/ruling/target/actual/`
into the directory with the expected issues `its/ruling/src/test/resources/expected/`.

From `its/ruling/`:

- for JS `cp -R target/actual/js/ src/test/expected/js`
- for TS `cp -R target/actual/ts/ src/test/expected/ts`
- for CSS `cp -R target/actual/css/ src/test/expected/css`

You can review the Ruling difference by running `diff -rq src/test/expected/js target/actual/js` from `its/ruling`.

To review the Ruling difference in SonarQube UI, put the breakpoint on `assertThat(...)` in `{JavaScript/CSS}RulingTest.java` and open in the browser the orchestrated local SonarQube.
Note that you can fix the port in `orchestrator.properties files`, e.g. `orchestrator.container.port=9100`.

### Debug `node` process during scan

You can run your own Node.js process manually and set the environment variable `SONARJS_EXISTING_NODE_PROCESS_PORT` with the value of the port where your process is listening to. When set, SonarJS will not start a new Node process and will send the analysis requests to the specified port instead.

## Adding a rule

### Rule Description

1. Create a PR with a rule description in RSPEC repo like described [here](https://github.com/SonarSource/rspec#create-or-modify-a-rule)
2. Link this RSPEC PR to the implementation issue in this repo
3. Make sure the implementation issue title contains the RSPEC number and name

### Implementing a rule

1. Generate rule metadata (JSON and HTML files) from [RSPEC](https://github.com/SonarSource/rspec#4-implement-the-rule) by running this command from the project's root:

```sh
java -jar <location of rule-api jar> generate -rule S1234 [-branch <RSPEC branch>]
```

2. Generate other files required for a new rule. If the rule is already covered by ESLint or its plugins, use the existing <ESLint-style rulekey> and add the `eslint` option.

```sh
npm run new-rule S1234 <ESLint-style rulekey>
// e.g.
npm run new-rule S1234 no-invalid-something [eslint]
```

This script:

- generates a Java check class for the rule `NoInvalidSomethingCheck.java`
- generates a `no-invalid-something.ts` file for the rule implementation
- generates a `comment-based/no-invalid-something.js` test file
- updates the `index.ts` file to include the new rule
- updates the `CheckList.java` to include the new rule

3. Update generated files
   - Make sure annotations in the Java class specify languages to cover (`@JavaScriptRule` and/or `@TypeScriptRule`)
   - If your rule has configurations or you are using some from an ESLint rule, override the `configurations()` method of the Java check class
     - You can use a `MyRuleCheckTest.java` test case to verify how the configurations will be serialized to JSON as shown [here](https://github.com/SonarSource/SonarJS/blob/master/sonar-plugin/javascript-checks/src/test/java/org/sonar/javascript/checks/NoEmptyClassCheckTest.java#L30)
   - If writing a rule for the test files, replace `implements EslintBasedCheck` with `extends TestFileCheck` in the Java class
   - In the generated metadata JSON file `javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S1234.json`, add (one or both):
     ```json
      "compatibleLanguages": [
        "JAVASCRIPT",
        "TYPESCRIPT"
      ]
     ```
4. Implement the rule logic in `no-invalid-something.ts`

   - Prefer using `meta.messages` to specify messages through `messageId`s. Message can be part of the RSPEC description, like [here](https://sonarsource.github.io/rspec/#/rspec/S4036/javascript#message).
   - Note that there are some helper functions in `src/linting/eslint/rules/helpers/`, also [searchable online](https://sonarsource.github.io/SonarJS/typedoc/)
   - If writing a regex rule, use [createRegExpRule](https://github.com/SonarSource/SonarJS/blob/master/src/linting/eslint/rules/helpers/regex/rule-template.ts#L52)

5. If possible, implement quick fixes for the rule:
   - Add its rule key in `src/linting/eslint/linter/quickfixes/rules.ts`
   - If the ESLint fix is at the root of the report (and not in a suggestion), add the message for the quick fix in `src/linting/eslint/linter/quickfixes/messages.ts`.
   - Add a code fixture that should provide a quickfix in `tests/linting/eslint/linter/fixtures/wrapper/quickfixes/<ESLint-style rulekey>.{js,ts}`. The [following test](https://github.com/SonarSource/SonarJS/blob/a99fd9614c4ee3052f8da1cfecbfc05ef16e95d1/tests/linting/eslint/linter/wrapper.test.ts#L334) asserts that the quickfix is enabled.

## Testing a rule

We support 2 kinds of rule unit-tests: ESLint's [RuleTester](https://eslint.org/docs/developer-guide/nodejs-api#ruletester) or our comment-based tests. Prefer comment-based tests as they are more readable!

### Comment-based testing

These tests are located in `tests/linting/eslint/rules/comment-based/` and they **MUST** be named after the rule they are testing (i.e. `semi.[(js|ts)x?]` to test ESLint `semi` rule). If options are to be passed to the tested rule, add a JSON file to the same directory following the same naming convention but with a `.json` extension (i.e. `semi.json`). The file must contain the array of options.

The contents of the test code have the following structure:

```javascript
some.clean.code();
some.faulty.code(); // Noncompliant N [[qf1,qf2,...]] {{Optional message to assert}}
//   ^^^^^^
// fix@qf1 {{Optional suggestion description}}
// edit@qf1 [[sc=1;ec=5]] {{text to replace line from [sc] column to [ec] column}}
faulty.setFaultyParam(true);
//     ^^^^^^^^^^^^^^< {{Optional secondary message to assert}}
```

The contents of the options file must be a valid JSON array:

```javascript
// brace-style.json
['1tbs', { allowSingleLine: true }];
```

#### Tests syntax

Given the above test snippet: the issue primary location (`// ^^^^`), issue messages (`{{...}}`), secondary location(s) (`// ^^^<`), issues count (`N`) and quick fixes are optional.

`N` is an integer defining the amount of issues will be reported in the line.

Only one of the methods (`{{messageN}}+` OR `N`) to define the expected issues can be used in a `Noncompliant` line. If you set both `N` and messages, the framework will throw an error.

If no `N` nor messages are provided, the engine will expect one issue to be raised. Meaning, `//Noncompliant` is equivalent to `//Noncompliant 1`.

`Noncompliant` lines will be associated by default to the line of code where they are writen. The syntax `@line_number` allows for an issue to be associated to another line:

```javascript
// Noncompliant@2 N [[qf1,qf2,...]] {{Optional message to assert}}
some.faulty.code();
```

Another option is to use relative line increments (`@+line_increment`) or decrements (`@-line_decrement`):

```javascript
// Noncompliant@+1
some.faulty.code();

another.faulty.code();
// another comment
// Noncompliant@-2
```

#### Secondary locations

Secondary locations are part of [Sonar issues](https://docs.sonarqube.org/latest/user-guide/issues/). They provide additional context to the raised issue. In order to use them, you must call the [toEncodedMessage()](https://github.com/SonarSource/SonarJS/blob/382fd7d4dad2a085ca5ac6d004cb38fe52720cca/src/linting/eslint/rules/helpers/location.ts#L44) function when reporting the issue message like this:

```javascript
context.report({
   node,
   message: toEncodedMessage(...),
});
```

In order to indicate secondary locations, you must use either `// ^^^^^<` or `// ^^^^>`, the arrow indicating whether the matching main location is either before or after the secondary one.

As stated before, the message is optional.

\*\*/!\*\* If you have used a secondary location in your test file, you must always report error messages using [toEncodedMessage()](https://github.com/SonarSource/SonarJS/blob/382fd7d4dad2a085ca5ac6d004cb38fe52720cca/src/linting/eslint/rules/helpers/location.ts#L44) in your rule, as it will be expecting it.

#### Quick fixes

Quick fixes refer to both ESLint [Suggestions](https://eslint.org/docs/latest/developer-guide/working-with-rules#providing-suggestions) and [Fixes](https://eslint.org/docs/latest/developer-guide/working-with-rules#applying-fixes). In our comment-based framework both use the same syntax, with the difference that a quick fix ID followed by an exclamation mark (`!`) will be internally treated as a `fix` with ESLint instead of as a suggestion. Please note that rules providing fixes **MUST** be tested always with fixes, otherwise the test will fail with the following error: `The rule fixed the code. Please add 'output' property.`. On the other side, it is optional to check against rule suggestions, meaning that even if a rule provides them, the tests can choose not to test their contents.

The `fix@` comment referring to a quick fix provides the suggestion description and is optional. Eslint fixes do not support descriptions, meaning a quick fix ID declared with an exclamation mark (i.e. `qf1!`) must **NOT** have a `fix@` matching comment (i.e. `fix@qf1`).

Each quick fix can have multiple editions associated to it. There are three different kind of operations to edit the code with quick fixes. Given a quick fix ID `qf`, these are the syntaxes used for each operation:

- `add@qf {{code to add}}` Add the string between the double brackets to a new line in the code.
- `del@qf` Remove the line
- `edit@qf1 [[sc=1;ec=5]] {{text to replace the range }}` Edit the line from start column `sc` to end column `ec` (both 0-based) with the provided string between the double brackets. Alternatively, one can conveniently use only `sc` or `ec`. also optional, meaning this syntax can be used too:
  - `edit@qf1 {{text to replace the whole line -do not include //Noncompliant comment- }}`

The line affected in each of these operations will be the line of the issue to which the quick fix is linked to. It is possible to use the line modifier syntax (`@[+|-]?line`). When using line increments/decrements, keep in mind the base number is the issue line number, not the line of the quick fix edit comment. Example for rule `brace-style`:

```javascript
//Noncompliant@+1 [[qf!]]
if (condition) {
  doSomething();
}
// edit@qf [[sc=16]] {{}}
// add@qf@+1 {{ doSomething()}}
```

The expected output is:

```javascript
if (condition) {
  doSomething();
}
```

Let's go through the syntax used in this example:

- The test provides a fix (note the `!` after the ID `qf`).
- The line `//Noncompliant@+1 [[qf!]]` means that in the following (`@+1`) line there is an issue for which we provide a quick fix.
- The line `// edit@qf [[sc=16]] {{}}` is providing an edit to the same line of the issue, replacing the contents after column 16 (`sc=16`) by an empty string (`{{}}`). An alternative with the same effect would be `// edit@qf {{if (condition) {}}`, which would replace the whole line by `if (condition) {`.
- Lastly, the line `// add@qf@+1 {{ doSomething()}}` will add a new line just after the issue line (`@+1`) with the contents `&nbsp;doSomething()`

Note that the length of the list of quick fixes cannot surpass the number of issues declared by `N` or the number of expected messages unless their matching issue is reassigned (see below).

Quick fixes IDs can be any `string`, they don't have to follow the `qfN` convention. The order of the list is important, as they will be assigned to the message in the matching position. If one provides 3 messages and 2 quick fixes which are not to be matched against first and second message, there are two options:

- A _dummy_ quick fix can be used as placeholder:

```javascript
some.faulty.code(); // Noncompliant [[qf1,qf2,qf3]] {{message1}} {{message2}} {{message3}}
// edit@qf1 {{fix for message1}}
// edit@qf3 {{fix for message3}}
// qf2 is declared but never used --> ignored by the engine
```

- Explicitly set the index (0-based) of the message to which the quick fix refers to with the syntax `=index` next to the quick fix ID:

```javascript
some.faulty.code(); // Noncompliant [[qf1,qf3=2]] {{message1}} {{message2}} {{message3}}
// edit@qf1 {{fix for message1}}
// edit@qf3 {{fix for message3}}
```

This last syntax is also needed if multiple suggestions are to be provided for the same issue:

```javascript
some.faulty.code(); // Noncompliant [[qf1,qf2=0]]
// fix@qf1 {{first alternative quickfix description}}
// edit@qf1 {{some.faulty?.code();}}
// fix@qf2 {{second alternative quickfix description}}
// edit@qf2 {{some.faulty && some.faulty.code();}}
```

To execute a single comment-based test:

```sh
npm run ctest -- -t="no-invalid-something"
```

#### Ruling

Make sure to run [Ruling ITs](#ruling-tests) for the new or updated rule (don't forget to rebuild the jar before that!).

If your rule does not raise any issue, you should write your own code that triggers your rule in:

- `its/sources/file-for-rules/S1234.js` for code
- `its/sources/file-for-rules/tests/S1234.js` for test code

You can simply copy and paste compliant and non-compliant examples from your RSPEC HTML description.

## Examples

- Security Hotspot implementation: [PR](https://github.com/SonarSource/SonarJS/pull/3148)
- Quality rule implemented with quickfix: [PR](https://github.com/SonarSource/SonarJS/pull/3141)
- Adding a rule already covered by ESLint or its plugins: [PR](https://github.com/SonarSource/SonarJS/pull/3134)
- Adding a quickfix for rule covered by ESLint or its plugins: [PR](https://github.com/SonarSource/SonarJS/pull/3058)
- Adding a rule covered by ESLint with an ESLint "fix" quick fix: [PR](https://github.com/SonarSource/SonarJS/pull/3751)
- Decorate a rule covered by ESLint: [PR](https://github.com/SonarSource/SonarJS/pull/3514)

## Misc

- Use issue number for a branch name, e.g. `issue-1234`
- You can use [AST explorer](https://astexplorer.net/) to explore the tree share. Use the `regexpp` parser when implementing a Regex rule.
- [ESlint's working with rules](https://eslint.org/docs/developer-guide/working-with-rules)
