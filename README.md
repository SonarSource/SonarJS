# SonarJS [![Build Status](https://travis-ci.org/SonarSource/SonarJS.svg?branch=master)](https://travis-ci.org/SonarSource/SonarJS) [![Quality Gate](https://next.sonarqube.com/sonarqube/api/badges/gate?key=org.sonarsource.javascript%3Ajavascript)](https://next.sonarqube.com/sonarqube/dashboard?id=org.sonarsource.javascript%3Ajavascript) [![Coverage](https://next.sonarqube.com/sonarqube/api/badges/measure?key=org.sonarsource.javascript%3Ajavascript&metric=coverage)](https://next.sonarqube.com/sonarqube/component_measures/domain/Coverage?id=org.sonarsource.javascript%3Ajavascript) [![twitter](https://img.shields.io/twitter/follow/sonarjs.svg)](https://twitter.com/intent/follow?screen_name=sonarjs)

SonarJS is a [static code analyser](https://en.wikipedia.org/wiki/Static_program_analysis) for the JavaScript language. It will allow you to produce stable and easily supported code by helping you to find and to correct bugs, vulnerabilities and smells in your code.

**[Have some feedback?](#support)**

**[Try out SonarTS, our analyzer for TypeScript!](https://github.com/SonarSource/sonarts)**

# Features

* Advanced rules based on control flow and data flow analysis
* [~190 rules](https://sonarcloud.io/coding_rules#languages=js) (including ~60 bug detection)
* Compatible with ECMAScript 2015-2017
* React JSX, Flow and Vue support
* Metrics (complexity, number of lines etc.)
* Import of [test coverage reports](/docs/DOC.md#coverage)
* [Custom rules](/docs/CUSTOM_RULES.md)

# Documentation
* [Get Started](/docs/DOC.md#get-started)
* [Advanced Configuration](/docs/DOC.md#advanced-configuration)
* [Configuring Rules Profile](/docs/DOC.md#rule-profile)
* [Writing Custom Rules](/docs/CUSTOM_RULES.md)
* [FAQ](/docs/DOC.md#faq)
* [Demo project analysis](https://sonarcloud.io/dashboard?id=yui)

# <a name="support"></a>Have question or feedback?
### Stack Overflow
If you have a question on how to use analyser (and the [docs](/docs/DOC.md) don't help you) [ask it](http://stackoverflow.com/questions/ask?tags=sonarjs) on Stack Overflow with `sonarjs` tag.

### GitHub issues
If you want to report a bug, request a feature or provide other kind of feedback, [create a GitHub issue](https://github.com/SonarSource/sonar-javascript/issues/new). 

### SonarQube Google Group
To provide feedback or to report a bug for a SonarQube platform send an email to `sonarqube@googlegroups.com`, the [SonarQube Google Group](https://groups.google.com/forum/#!forum/sonarqube). Please do not forget to specify the details of your request, as well as analysers' and SonarQube versions.

# Contributing

#### 1. GitHub issue
To request a new feature, [create a GitHub issue](https://github.com/SonarSource/sonar-javascript/issues/new). Even if you plan to implement it yourself and submit it back to the community, please create an issue to be sure that we can follow up on it.

#### 2. Pull Request
To submit a contribution, create a pull request for this repository. Please make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset) and all [tests](/docs/DEV.md#testing) are passing (Travis build is created for each PR).

#### Custom Rules
If you have an idea for a rule but you are not sure that everyone needs it you can implement a [custom rule](/docs/CUSTOM_RULES.md) available only for you. 

## License

Copyright 2011-2017 SonarSource.

Licensed under the [GNU Lesser General Public License, Version 3.0](http://www.gnu.org/licenses/lgpl.txt)
