[![Quality Gate](https://next.sonarqube.com/sonarqube/api/project_badges/measure?project=org.sonarsource.javascript%3Ajavascript&metric=alert_status)](https://next.sonarqube.com/sonarqube/dashboard?id=org.sonarsource.javascript%3Ajavascript) [![Coverage](https://next.sonarqube.com/sonarqube/api/project_badges/measure?project=org.sonarsource.javascript%3Ajavascript&metric=coverage)](https://next.sonarqube.com/sonarqube/component_measures/domain/Coverage?id=org.sonarsource.javascript%3Ajavascript)

This SonarSource project is a [static code analyzer](https://en.wikipedia.org/wiki/Static_program_analysis) for the JavaScript, TypeScript, and CSS languages to deliver integrated code quality and security.

:arrow_right: [Have some feedback?](#support)

This repository now hosts [eslint-plugin-sonarjs](./packages/jsts/src/rules/README.md), our plugin for ESLint.

# Features

- Advanced rules based on pattern matching and control flow analysis
- [475 JS rules](https://rules.sonarsource.com/javascript) and [492 TS rules](https://rules.sonarsource.com/typescript)
- [26 CSS rules](https://rules.sonarsource.com/css)
- Compatible with ECMAScript 2015-2020
- React JSX, Flow, Vue, and AWS lambda functions support for JavaScript and TypeScript
- CSS, SCSS, SASS, Less, also 'style' inside HTML and VueJS files
- Metrics (complexity, number of lines, etc.)
- Import of test coverage reports
- Import of ESLint, TSLint, and Stylelint issues

# Documentation

You can find [documentation here](https://docs.sonarqube.org/latest/analysis/languages/javascript/)

# <a name="support"></a>Questions or feedback?

### SonarSource Community Forum

If you want to report a bug, request a feature, or provide other kind of feedback, please use [SonarQube Community Forum](https://community.sonarsource.com/). Please do not forget to specify the details of your request, code reproducer, and versions of projects you use.

# Contributing

## Prerequisites

To work on this project, it is required to have the following tools installed:

- [JDK 17](https://docs.aws.amazon.com/corretto/latest/corretto-17-ug/what-is-corretto-17.html)
- [Node.js](https://nodejs.org/en) >= 22
- [npm](https://www.npmjs.com/) >= 8
- [Maven](https://maven.apache.org/) >= 3.8

## How-to

### Build the project

The project can be built into the SonarJS Plugin by installing Node.js dependencies, and executing the usual Maven `install` command.

```shell
npm install
mvn clean install
```

### Request a new feature

To request a new feature, create a new thread in [SonarSource Community Forum](https://community.sonarsource.com/). Even if you plan to implement it yourself and submit it back to the community, please create a thread to be sure that we can follow up on it.

### Create a Pull Request

To submit a contribution, create a pull request for this repository. Please make sure that you follow our [code style](https://github.com/SonarSource/sonar-developer-toolset) and that all [tests](/docs/DEV.md#testing) are passing.

## Work with us

Would you like to work on this project full-time? We are hiring! Check out https://www.sonarsource.com/hiring

## License

Copyright 2011-2024 SonarSource.

SonarQube analyzers released after November 29, 2024, including patch fixes for prior versions, are published under the [Sonar Source-Available License Version 1 (SSALv1)](LICENSE.txt).

See individual files for details that specify the license applicable to each file. Files subject to the SSALv1 will be noted in their headers.
