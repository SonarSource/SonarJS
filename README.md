# SonarJS [![Build Status](https://travis-ci.org/SonarSource/sonar-javascript.svg?branch=master)](https://travis-ci.org/SonarSource/sonar-javascript) [![Quality Gate](https://next.sonarqube.com/sonarqube/api/badges/gate?key=org.sonarsource.javascript%3Ajavascript)](https://next.sonarqube.com/sonarqube/dashboard?id=org.sonarsource.javascript%3Ajavascript) [![Coverage](https://next.sonarqube.com/sonarqube/api/badges/measure?key=org.sonarsource.javascript%3Ajavascript&metric=coverage)](https://next.sonarqube.com/sonarqube/component_measures/domain/Coverage?id=org.sonarsource.javascript%3Ajavascript)

SonarJS is a [static code analyser](https://en.wikipedia.org/wiki/Static_program_analysis) for JavaScript language used as an extension for the [SonarQube](http://www.sonarqube.org/) platform. It will allow you to produce stable and easily supported code by helping you to find and to correct bugs, vulnerabilities and smells in your code.

**[Feedback](#support)**

# Features

* ~190 rules (including ~60 bug detection)
* Compatible with ECMAScript 2015-2017
* React JSX, Flow and Vue single-file component .vue support
* Metrics (complexity, number of lines etc.)
* Import of [test coverage reports](http://docs.sonarqube.org/display/PLUG/JavaScript+Coverage+Results+Import)
* [Custom rules](http://docs.sonarqube.org/display/PLUG/Custom+Rules+for+JavaScript)

# Useful links

* [Project homepage](https://redirect.sonarsource.com/plugins/javascript.html)
* [Documentation](https://docs.sonarqube.org/display/PLUG/SonarJS)
* [Issue tracking](http://jira.sonarsource.com/browse/SONARJS)
* [Available rules](https://sonarqube.com/coding_rules#languages=js)
* [Google Group for feedback](https://groups.google.com/forum/#!forum/sonarqube) (sonarqube@googlegroups.com)
* [Demo project analysis](https://sonarqube.com/dashboard?id=react)

# <a name="support"></a>Have question or feedback?
### Stack Overflow
If you have a question on how to use analyser (and the [docs](https://docs.sonarqube.org/display/PLUG/SonarJS) don't help you) [ask it](http://stackoverflow.com/questions/ask?tags=sonarjs) on Stack Overflow with `sonarjs` tag.

### GitHub issues
If you want to report a bug, request a feature or provide other kind of feedback, [create a GitHub issue](https://github.com/SonarSource/sonar-javascript/issues/new). 

### SonarQube Google Group
To provide feedback or to report a bug for a SonarQube platform send an email to sonarqube@googlegroups.com, the [SonarQube Google Group](https://groups.google.com/forum/#!forum/sonarqube). Please do not forget to specify the details of your request, as well as analysers' and SonarQube versions.

# Contributing

### 1. GitHub issue
To request a new feature, [create a GitHub issue](https://github.com/SonarSource/sonar-javascript/issues/new). Even if you plan to implement it yourself and submit it back to the community, please create an issue to be sure that we can follow up on it.

### 2. Pull Request
To submit a contribution, create a pull request for this repository. Please make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset) and all [tests](#testing) are passing (Travis build is created for each PR).

### Custom Rules
If you have an idea for a rule but you are not sure that everyone needs it you can implement a [custom rule](http://docs.sonarqube.org/display/PLUG/Custom+Rules+for+JavaScript) available only for you. 

# <a name="testing"></a>Testing
To run tests locally follow these instructions

### Build the Project and Run Unit Tests
To build the plugin and run its unit tests, execute this command from the project's root directory:
```
mvn clean install
```

### Integration Tests
To run integration tests, you will need to create a properties file like the one shown below, and set its location in an environment variable named `ORCHESTRATOR_CONFIG_URL`.
```
# version of SonarQube server
sonar.runtimeVersion=6.5

orchestrator.updateCenterUrl=http://update.sonarsource.org/update-center-dev.properties
```
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

This test gives you the opportunity to examine the issues created by each rule and make sure they're what you expect. You can inspect new/lost issues checking web-pages mentioned in the logs at the end of analysis:
```
INFO  - HTML Issues Report generated: /path/to/project/sonar-javascript/its/sources/src/.sonar/issues-report/issues-report.html
INFO  - Light HTML Issues Report generated: /path/to/project/sonar-javascript/its/sources/src/.sonar/issues-report/issues-report-light.html
```
If everything looks good to you, you can copy the file with the actual issues located at
```
sonar-javascript/its/ruling/target/actual/
``` 
into the directory with the expected issues
```
sonar-javascript/its/ruling/src/test/resources/expected/
```

### License

Copyright 2011-2017 SonarSource.

Licensed under the [GNU Lesser General Public License, Version 3.0](http://www.gnu.org/licenses/lgpl.txt)
