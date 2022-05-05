# Development

## Adding a rule
* run `new-rule` script
```
# from project root
java -jar <location of rule-api jar> generate -rule S1234
cd eslint-bridge
yarn new-rule S1234 no-something-somewhere 
```

## <a name="testing"></a>Testing
To run tests locally follow these instructions

### Build the Project and Run Unit Tests
You will need Java development environment (JDK, Maven), [Node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/lang/en/) 
to build the project. You can also use dockerfile in (./.cirrus/nodejs-lts.Dockerfile) which bundles all dependencies and 
is used for CI pipeline.

To build the plugin and run its unit tests, execute this command from the project's root directory:
```
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
```
 git submodule init
 git submodule update
```
#### Plugin Test
The "Plugin Test" is an additional integration test which verifies plugin features such as metric calculation, coverage etc. To launch it, execute this command from directory `its/plugin`:
```
mvn clean install
```  

#### Ruling Test
The "Ruling Test" is a special integration test which launches the analysis of a large code base, saves the issues created by the plugin in report files, and then compares those results to the set of expected issues (stored as JSON files). To launch ruling test:
```
cd its/ruling
mvn clean install
```

This test gives you the opportunity to examine the issues created by each rule and make sure they're what you expect. You can inspect new/lost issues checking SonarQube UI (use DEBUG mode and put a breakpoint on assertion) at the end of analysis. If everything looks good to you, you can copy the file with the actual issues located at
```
sonar-javascript/its/ruling/target/actual/
``` 
into the directory with the expected issues
```
sonar-javascript/its/ruling/src/test/resources/expected/
```
