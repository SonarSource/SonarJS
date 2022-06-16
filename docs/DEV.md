# Developer Guide

## Prerequisites
- [JDK 11](https://docs.aws.amazon.com/corretto/latest/corretto-11-ug/what-is-corretto-11.html)
- [Maven](https://maven.apache.org/install.html)
- Node.js (we recommend using [NVM](https://github.com/nvm-sh/nvm#installing-and-updating))

You can also use Docker container defined in `./.cirrus/nodejs-lts.Dockerfile` which bundles all required dependencies and is used for our CI pipeline.

## Build and run unit tests
To build the plugin and run its unit tests, execute this command from the project's root directory:

```sh
mvn clean install
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
```
cd its/ruling
mvn clean install
```

This test gives you the opportunity to examine the issues created by each rule and make sure that they are what you expect. You can inspect new/lost issues checking the SonarQube UI (use DEBUG mode and put a breakpoint on the assertion) at the end of analysis. 

If everything looks good to you, you can copy the file with the actual issues located at `its/ruling/target/actual/`
into the directory with the expected issues `its/ruling/src/test/resources/expected/`.

From `its/ruling/`:
* for JS `cp -R target/actual/ts/ src/test/expected/ts`
* for TS `cp -R target/actual/js/ src/test/expected/js`
* for CSS `cp -R target/actual/css/ src/test/expected/css`

You can review the Ruling difference by running `diff -rq src/test/expected/js target/actual/js` from `its/ruling`.

To review the Ruling difference in SonarQube UI, put the breakpoint on `assertThat(...)` in `{JavaScript/CSS}RulingTest.java` and open in the browser the orchestrated local SonarQube. 
Note that you can fix the port in `orchestrator.properties files`, e.g. `orchestrator.container.port=9100`.

## Adding a rule

### Rule Description
1. Create a PR with a rule description in RSPEC repo like described [here](https://github.com/SonarSource/rspec#create-or-modify-a-rule)
2. Link this RSPEC PR to the implementation issue in this repo
5. Make sure the implementation issue title contains the RSPEC number and name

### Implementing a rule
1. Generate rule metadata (JSON and HTML files) from [RSPEC](https://github.com/SonarSource/rspec#4-implement-the-rule) by running this command from the project's root:

```sh
java -jar <location of rule-api jar> generate -rule S1234 [-branch <RSPEC branch>]
```

1. Generate other files required for a new rule. If the rule is already covered by ESLint or its plugins, use the existing <ESLint-style rulekey> and add the `eslint` option.
```sh
cd eslint-bridge
npm run new-rule S1234 <ESLint-style rulekey>
// e.g.
npm run new-rule S1234 no-invalid-something [eslint]
```
This script:
* generates a Java check class for the rule `NoInvalidSomethingCheck.java`
* generates a `no-invalid-something.ts` file for the rule implementation
* updates the `main.ts` file to include the new rule
* updates the `CheckList.java` to include the new rule

3. Update generated files
   * Make sure annotations in the Java class specify languages to cover (`@JavaScriptRule` and/or `@TypeScriptRule`)
   * If required, override the `configurations()` method of the Java check class
   * If writing a rule for the test files, replace `implements EslintBasedCheck` with `extends TestFileCheck` in the Java class
   * In the generated metadata JSON file `javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S1234.json`, add (one or both):
      ```json
       "compatibleLanguages": [
         "JAVASCRIPT",
         "TYPESCRIPT"
       ]
      ```
4. Implement the rule logic in `no-invalid-something.ts`
   * Prefer using `meta.messages` to specify messages through `messageId`s. Message can be part of the RSPEC description, like [here](https://sonarsource.github.io/rspec/#/rspec/S4036/javascript#message).
   * Note that there are some helper functions in `eslint-bridge/src/utils/`
   * If writing a regex rule, use [createRegExpRule](https://github.com/SonarSource/SonarJS/blob/6798d21cd9fec8da929334460b364d548b0a608c/eslint-bridge/src/rules/regex-rule-template.ts#L53)
   * If possible implement quickfixes for the rule (then add its rule key in `eslint-bridge/src/quickfix.ts`).

### Testing the rule

`eslint-bridge` supports 2 kinds of rule unit-tests: ESLint's [RuleTester](https://eslint.org/docs/developer-guide/nodejs-api#ruletester) or our comment-based tests
   * Prefer comment-based tests as they are more readable
   * Use the ESlint rule tester to test quickfixes, as our comment-based one does not support them yet

#### Comment-based testing

These tests are located in `eslint-bridge/tests/rules/fixtures/`, they follow the following structure:

```javascript
some.clean.code();
some.faulty.code(); // Noncompliant {{Optional message to assert}} 
//   ^^^^^^
```

The issue primary location (`// ^^^^`) and issue message are optional.

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

* Security Hotspot implementation: [PR](https://github.com/SonarSource/SonarJS/pull/3148)
* Quality rule implemented with quickfix: [PR](https://github.com/SonarSource/SonarJS/pull/3141)
* Adding a rule already covered by ESLint or its plugins: [PR](https://github.com/SonarSource/SonarJS/pull/3134)
* Adding a quickfix for rule covered by ESLint or its plugins: [PR](https://github.com/SonarSource/SonarJS/pull/3058)

## Misc
* Use issue number for a branch name, e.g. `issue-1234`
* You can use [AST explorer](https://astexplorer.net/) to explore the tree share. Use the `regexpp` parser when implementing a Regex rule.
* [ESlint's working with rules](https://eslint.org/docs/developer-guide/working-with-rules)
