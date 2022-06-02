# Development

This document describes setup your project environment locally and contribute to it by implementing new rules and their tests.

## Setup
You will need these tools locally to build the project:
- [JDK](https://xtranet-sonarsource.atlassian.net/wiki/spaces/DEV/pages/776711/Developer+Box#Java-runtime)
- [Maven](https://maven.apache.org/install.html)
- [Node.js](https://github.com/nvm-sh/nvm#installing-and-updating)

You can also use dockerfile in (./.cirrus/nodejs-lts.Dockerfile) which bundles all dependencies and is used for CI pipeline.
### Build the project and run unit tests
To build the plugin and run its unit tests, execute this command from the project's root directory:

```sh
mvn clean install
```

#### Comment-based tests

We implemented a framework to write unit tests for rules using a more readable format:

```javascript
crypto.createHash('sha1'); // Noncompliant {{Make sure this weak hash algorithm is not used in a sensitive context here.}}
//     ^^^^^^^^^^
```

These tests are implemented in [tests/rules/fixtures](../eslint-bridge/tests/rules/fixtures/)

- You can run a single one using: `npm run ctest -- -t="your-rule"` (the `--` double dash is necessary)

### Integration Tests
Before running any of integration tests make sure the submodules are checked out:

```sh
 git submodule init
 git submodule update
```

#### Plugin Tests
The "Plugin Test" is an additional integration test which verifies plugin features such as metric calculation, coverage etc. To launch it, execute this command from directory `its/plugin`:

```sh
mvn clean install
```  

#### Ruling Tests
The "Ruling Test" is a special integration test which launches the analysis of a large code base, saves the issues created by the plugin in report files, and then compares those results to the set of expected issues (stored as JSON files). To launch ruling test:
```
cd its/ruling
mvn clean install
```

This test gives you the opportunity to examine the issues created by each rule and make sure they're what you expect. You can inspect new/lost issues checking SonarQube UI (use DEBUG mode and put a breakpoint on assertion) at the end of analysis. If everything looks good to you, you can copy the file with the actual issues located at
```
its/ruling/target/actual/
``` 
into the directory with the expected issues
```
its/ruling/src/test/resources/expected/
```

## Adding a rule

### Card stuff
1. On [Kanban](https://github.com/SonarSource/SonarJS/projects/3), move card from "To do" to "In progress", The issue should be assigned to you automatically
2. Comment on the issue linking to the [Rspec PR](https://github.com/SonarSource/rspec/pulls) if exists 
3. Rename issue to match Rspec name
4. Checkout new branch named `issue-1234`

### Implementing a rule
Load the files from [Rspec](https://github.com/SonarSource/rspec#4-implement-the-rule) by running this command from the project's root:

```sh
java -jar <location of rule-api jar> generate -rule S1234 [-branch <RSPEC branch>]
```

When naming your rule, avoid using "No" at the beginning as it is implicit.

1. Create Java class (as above) in `javascript-checks/src/main/java/org/sonar/javascript/YourRuleCheck.java`
   1. Add `@JavaScriptRule` and/or `@TypeScriptRule`
   2. Add rule id as `@Rule(key="S1234")`
   3. If writing a rule for test files, use `extends TestFileCheck` otherwise, use `implements EslintBasedCheck`
   4. have *at minimum* single method `public String eslintKey()` that does `return "your-rule"`
      1. If reusing ESlint implementation, the returned id must correspond to one in https://typescript-eslint.io/rules/
2. Add your rule in `javascript-checks/src/main/java/org/sonar/javascript/checks/CheckList.java` as `YourRuleCheck.class`
3. In the generated metadata JSON file `javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S1234.json`, add (one or both):
      ```json
       "compatibleLanguages": [
         "JAVASCRIPT",
         "TYPESCRIPT"
       ]
      ```
4. (Reusing ESlint only) See [Reusing ESlint rule](#reusing-rule-from-eslint).
5. (from scratch only) in `eslint-bridge/src/rules/main.ts`, add your rule import like:
   1. `import { rule as yourRule } from './your-rule';`
   2. `ruleModules['your-rule'] = yourRule;`
6. (from scratch only) Implement rule in `eslint-bridge/src/rules/your-rule.ts`
   1. Write up your coding examples into [AST explorer](https://astexplorer.net/). You should use the `regexpp` parser when implementing a Regex rule.
   2. Figure out the structure that you are looking for and implement the rule following [ESlint's working with rules](https://eslint.org/docs/developer-guide/working-with-rules)
   3. Use `meta.messages` and refer to it by `messageId`.
   4. Reuse message from Rspec if such one is defined [as in S4036](https://sonarsource.github.io/rspec/#/rspec/S4036/javascript#message)
   5. Use the helper functions from `eslint-bridge/src/utils/`
   6. If writing a regex rule, use `[createRegExpRule](https://github.com/SonarSource/SonarJS/blob/6798d21cd9fec8da929334460b364d548b0a608c/eslint-bridge/src/rules/regex-rule-template.ts#L53)`.
7. (from scratch only) Implement comment-based tests in `eslint-bridge/tests/rules/fixtures/your-rule.js`. See [comment-based testing](#comment-based-testing).
8. (from scratch only) If applicable, implement quickfix tests in `eslint-bridge/tests/rules/your-rule.test.ts`.
   1. Ref.: [RuleTester](https://eslint.org/docs/developer-guide/nodejs-api#ruletester)
   2. We use the ESlint rule tester for quickfixes, as our comment-based one does not support them yet.
   3. We don't support quickfixes for Regex
9. You will need to verify how your new rule will behave by running it on "rulings" which are a subset of [Peach](https://xtranet-sonarsource.atlassian.net/wiki/spaces/LANG/pages/271352055/Peach+management). See [Rulings](#rulings).
10.  You might want to checkout how your rule runs on Peach, see [release on Peach](#release-on-peach).
11. When you have opened a PR and pushed some data, if the project builds, you will get an automatic analysis on Next, Fix eventual smells and push the coverage to 100%

#### Comment-based testing

These tests are located in `eslint-bridge/tests/rules/fixtures/`, they follow the following structure:

```javascript
some clean code
some faulty code // Noncompliant {{Expected message only required at first occurence if same}} 
//   ^^^^^^
```

The `// Noncompliant ...` comment and the one below (`// ^^^^`) are necessary, otherwise it will crash.
We recommend using this format for verifying the analyzer flagging as it is humanly readable compared to the ESlint tester described below.

### Reusing rule from ESlint

#### Verify how ESlint handles it

1. Setup a repo with dependencies [example repo](https://github.com/ilia-kebets-sonarsource/TypeScript-Node-Starter/pull/1): `typescript`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`
2. add rule to `.eslintrc` if needed
3. write example code that triggers the rule highlight

### Rulings

You can verify how your new rule will behave by running on "rulings" which are a subset of "peach" that are part of the SonarJS repo.

Rulings run against the latest build of your project. If you have worked in `eslint-bridge/`, you must [rebuild the project](#build-the-project-and-run-unit-tests) to apply your changes.

#### Run them

If you run into issues when [running them](#ruling-tests), such as `{"errors":[{"msg":"A rule with the key \u0027CommentRegexTest\u0027 already exists"}]}`, you can run the rulings separately (JS, TS, CSS) following the [View code smells in Sonarqube guide](#view-code-smells-in-sonarqube) without the breakpoints and selecting `Run test`.

#### View code smells

1. In `its/ruling`, run `diff -rq src/test/expected/js target/actual/js`.
2. For each line (should be `javascript-S1234.json`), copy its name, find it using VScode finder (CMD+P)
3. Find the file that is mentioned using the VScode finder, and assess if the flag was legitimate

#### View code smells in Sonarqube

If there are too many new issues flagged, it might be easier to view them through Sonarqube:

In the file `its/rulings/src/test/java/org/sonar/javascript/it/{Java/TypeScriptRulingTest.java}`
1. Add a breakpoint at the end of `runRulingTest()`, on line: `assertThat(...)`
2. Launch rulings by right-clicking left of the class declaration and selecting `Run debug`.
3. Find PORT, searching for following string in `DEBUG CONSOLE`: `ANALYSIS SUCCESSFUL`
4. Open in browser
5. Evaluate

#### Update expected ruling errors

After you have run the rulings, it will have generated the `its/ruling/target/actual/ts/` & `its/ruling/target/actual/js/` folders.

From `its/ruling/`, run:
1. `cp -R target/actual/ts/ src/test/expected/ts`.
2. `cp -R target/actual/js/ src/test/expected/js`.
to update the expected issues.

### Release on Peach

1. Add branch prefixed with `dogfood/` such as: https://github.com/SonarSource/sonar-cpp/blob/master/docs/Testing.adoc#dogfood-branch
2. Wait for after 19:00 CET and check: Peaches>Rules>Typescript+name-of-rule as https://peach.sonarsource.com/coding_rules?languages=ts&open=typescript%3AS6425&q=import
3. Or run it manually as described: https://xtranet-sonarsource.atlassian.net/wiki/spaces/LANG/pages/271352055/Peach+management

#### Review security hotspot flagging

1. Go to projects, select: languages=ts or js
2. Go through all projects that were recently analzed, by checking the “last analysis” timestamp
3. Go to: new code/new security hotspots
4. Look for your rule searching by rspec message
5. Ensure that it behaves as expected	
## Inspirations:

- Security Hotspot implemented from scratch: [S4036](https://github.com/SonarSource/SonarJS/pull/3148)
- Code smell implemented from scratch, with quickfix: [S6426](https://github.com/SonarSource/SonarJS/pull/3141)
- Rule reusing ESlint impementation: [S6425](https://github.com/SonarSource/SonarJS/pull/3134)
