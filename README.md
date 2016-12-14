# SonarJS [![Build Status](https://travis-ci.org/SonarSource/sonar-javascript.svg?branch=master)](https://travis-ci.org/SonarSource/sonar-javascript)

SonarJS is a code analyzer for JavaScript projects.

# Useful links

* [Project homepage](https://www.sonarsource.com/why-us/products/languages/javascript.html)
* [Issue tracking](http://jira.sonarsource.com/browse/SONARJS)
* [Available rules](https://sonarqube.com/coding_rules#languages=js)
* [Google Group for feedback](https://groups.google.com/forum/#!forum/sonarqube)
* [Demo project analysis](https://sonarqube.com/dashboard?id=react)

# Have question or feedback?
To provide feedback (request a feature, report a bug etc.) use the [SonarQube Google Group](https://groups.google.com/forum/#!forum/sonarqube). Please do not forget to specify the language (JavaScript!), plugin version and SonarQube version.
If you have a question on how to use plugin (and the [docs](http://docs.sonarqube.org/display/PLUG/JavaScript+Plugin) don't help you) direct it to [StackOverflow](http://stackoverflow.com/questions/tagged/sonarqube+javascript) tagged both `sonarqube` and `javascript`.

# Contributing

### Topic in SonarQube Google Group
To request a new feature, please create a new thread in [SonarQube Google Group](https://groups.google.com/forum/#!forum/sonarqube). Even if you plan to implement it yourself and submit it back to the community, please start a new thread first to be sure that we can use it.

### Pull Request (PR)
To submit a contribution, create a pull request for this repository. Please make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset#code-style) and all [tests](#testing) are passing (Travis build is created for each PR).

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
# version of SonarQube Server
sonar.runtimeVersion=5.6

orchestrator.updateCenterUrl=http://update.sonarsource.org/update-center-dev.properties
```

#### Plugin Test
The "Plugin Test" is an additional integration test which verifies plugin features such as metric calculation, coverage etc. To launch it, execute this command from directory `its/plugin`:
```
mvn clean install
```  

#### Ruling Test
The "Ruling Test" is a special integration test which launches the analysis of a large code base, saves the issues created by the plugin in report files, and then compares those results to the set of expected issues (stored as JSON files).

* To run the test, first make sure the submodules are checked out:
```
  git submodule init 
  git submodule update
```  
* Launch ruling test 
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
