<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets-eu-01.kc-usercontent.com/ef593040-b591-0198-9506-ed88b30bc023/a23fc7ba-23f0-489a-829d-ed88c0748521/Sonar_Logo_Dark%20Backgrounds.svg">
    <img src="https://assets-eu-01.kc-usercontent.com/ef593040-b591-0198-9506-ed88b30bc023/82c13eba-d95c-4bb8-8007-7ce77c14e043/Sonar_Logo_Light%20Backgrounds.svg" alt="Sonar logo" width="400">
  </picture>
</p>

# SonarJS

[![Quality Gate](https://next.sonarqube.com/sonarqube/api/project_badges/measure?project=org.sonarsource.javascript%3Ajavascript&metric=alert_status)](https://next.sonarqube.com/sonarqube/dashboard?id=org.sonarsource.javascript%3Ajavascript) [![Coverage](https://next.sonarqube.com/sonarqube/api/project_badges/measure?project=org.sonarsource.javascript%3Ajavascript&metric=coverage)](https://next.sonarqube.com/sonarqube/component_measures/domain/Coverage?id=org.sonarsource.javascript%3Ajavascript)
[![GitHub stars](https://img.shields.io/github/stars/SonarSource/SonarJS?style=flat)](https://github.com/SonarSource/SonarJS)
[![License](https://img.shields.io/badge/license-SSALv1-blue)](#license)
[![Community forum](https://img.shields.io/badge/community-forum-blue)](https://community.sonarsource.com/)

SonarJS inspects JavaScript, TypeScript, and CSS for bugs, vulnerabilities, and maintainability issues. Findings appear in SonarQube for IDE and in project analysis on SonarQube Server or SonarQube Cloud.

SonarJS analyzes developer-written and AI-generated code, giving teams a consistent way to verify changes before they reach production.

:arrow_right: [Have some feedback?](#support)

This repository now hosts [eslint-plugin-sonarjs](packages/analysis/src/jsts/rules/README.md), our plugin for ESLint.

# Features

- Advanced rules based on pattern matching and control flow analysis
- [529 JS rules](https://rules.sonarsource.com/javascript) and [547 TS rules](https://rules.sonarsource.com/typescript)
- [43 CSS rules](https://rules.sonarsource.com/css)
- Compatible with ECMAScript 2015-2020
- React JSX, Flow, Vue, and AWS lambda functions support for JavaScript and TypeScript
- CSS, SCSS, SASS, Less, also 'style' inside HTML and VueJS files
- Metrics (complexity, number of lines, etc.)
- Import of test coverage reports
- Import of ESLint, TSLint, and Stylelint issues

# Use SonarJS

SonarJS is used through [SonarQube Server](https://www.sonarsource.com/products/sonarqube/server/), [SonarQube Cloud](https://www.sonarsource.com/products/sonarqube/cloud/), and [SonarQube for IDE](https://www.sonarsource.com/products/sonarqube/ide/). For JavaScript and TypeScript feedback in ESLint, see the [eslint-plugin-sonarjs](packages/analysis/src/jsts/rules/README.md) package.

# Documentation

You can find [documentation here](https://docs.sonarqube.org/latest/analysis/languages/javascript/)

# <a name="support"></a>Questions or feedback?

### SonarSource Community Forum

If you want to report a bug, request a feature, or provide other kind of feedback, please use [SonarQube Community Forum](https://community.sonarsource.com/). Please do not forget to specify the details of your request, code reproducer, and versions of projects you use.

# Contributing

## Prerequisites

To work on this project, it is required to have the following tools installed:

- [JDK 21](https://docs.aws.amazon.com/corretto/latest/corretto-21-ug/what-is-corretto-21.html)
- [Node.js](https://nodejs.org/en) >= 22
- [npm](https://www.npmjs.com/) >= 8
- [Maven](https://maven.apache.org/) >= 3.8

## How-to

### Build the project

Install Node.js dependencies with `npm ci` first.

For normal local development, build with the tracked rule metadata already present in the checkout:

```shell
npm ci
mvn install
```

To refresh RSPEC rule data before a clean rebuild, run:

```shell
npm run rspec:refresh
mvn clean install
```

`package.json` intentionally keeps only Node-oriented workflows plus the explicit `rspec:refresh`
entrypoint. Maven builds are meant to be invoked directly.

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
