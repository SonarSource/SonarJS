# SonarJS [![Build Status](https://travis-ci.org/SonarSource/SonarJS.svg?branch=master)](https://travis-ci.org/SonarSource/SonarJS) [![Quality Gate](https://next.sonarqube.com/sonarqube/api/project_badges/measure?project=org.sonarsource.javascript%3Ajavascript&metric=alert_status)](https://next.sonarqube.com/sonarqube/dashboard?id=org.sonarsource.javascript%3Ajavascript) [![Coverage](https://next.sonarqube.com/sonarqube/api/project_badges/measure?project=org.sonarsource.javascript%3Ajavascript&metric=coverage)](https://next.sonarqube.com/sonarqube/component_measures/domain/Coverage?id=org.sonarsource.javascript%3Ajavascript) [![twitter](https://img.shields.io/twitter/follow/sonardash.svg)](https://twitter.com/intent/follow?screen_name=sonardash) [![NPM version](https://badge.fury.io/js/sonarjs.svg)](http://badge.fury.io/js/sonarjs)

SonarJS is a [static code analyser](https://en.wikipedia.org/wiki/Static_program_analysis) for the JavaScript language. It will allow you to produce stable and easily supported code by helping you to find and to correct bugs, vulnerabilities and smells in your code.

:arrow_right: [Have some feedback?](#support)

:arrow_right: [SonarTS](https://github.com/SonarSource/sonarts), our analyzer for TypeScript

:arrow_right: [eslint-plugin-sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs), our plugin for ESLint

# Features

* Advanced rules based on control flow and data flow analysis
* [~190 rules](https://rules.sonarsource.com/javascript) (including ~60 bug detection)
* Compatible with ECMAScript 2015-2017
* React JSX, Flow and Vue support
* Metrics (complexity, number of lines etc.)
* Import of [test coverage reports](/docs/DOC.md#coverage)
* Import of [ESLint issues](/docs/DOC.md#eslint)
* [Custom rules](/docs/CUSTOM_RULES.md)

# Documentation
* [Get Started](/docs/DOC.md#get-started)
* [Advanced Configuration](/docs/DOC.md#advanced-configuration)
* [Configuring Rules Profile](/docs/DOC.md#rule-profile)
* [Writing Custom Rules](/docs/CUSTOM_RULES.md)
* [FAQ](/docs/DOC.md#faq)
* [Demo project analysis](https://sonarcloud.io/dashboard?id=yui)

# <a name="support"></a>Have question or feedback?
### GitHub issues
If you want to report a bug, request a feature or provide other kind of feedback, [create a GitHub issue](https://github.com/SonarSource/sonar-javascript/issues/new). 

### SonarQube Community Forum
You can also use [SonarQube Community Forum](https://community.sonarsource.com/). Please do not forget to specify the details of your request, as well as analysers' and SonarQube versions.

### Twitter
We have a [twitter account](https://twitter.com/sonardash) where you can follow the development of this plugin.

# Contributing

#### 1. GitHub issue
To request a new feature, [create a GitHub issue](https://github.com/SonarSource/sonar-javascript/issues/new). Even if you plan to implement it yourself and submit it back to the community, please create an issue to be sure that we can follow up on it.

#### 2. Pull Request
To submit a contribution, create a pull request for this repository. Please make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset) and all [tests](/docs/DEV.md#testing) are passing (Travis build is created for each PR).

#### Custom Rules
If you have an idea for a rule but you are not sure that everyone needs it you can implement a [custom rule](/docs/CUSTOM_RULES.md) available only for you.

#### Work with us
Would you like to work on this project full-time? We are hiring! Check out https://www.sonarsource.com/hiring 

## License

Copyright 2011-2017 SonarSource.

Licensed under the [GNU Lesser General Public License, Version 3.0](http://www.gnu.org/licenses/lgpl.txt)
