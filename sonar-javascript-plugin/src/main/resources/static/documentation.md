---
title: JavaScript / TypeScript
key: javascript
---

<!-- static -->
<!-- update_center:javascript -->
<!-- /static -->


## Prerequisites

In order to analyze JavaScript or TypeScript code, you need to have supported version of Node.js installed on the
machine running the scan. Supported versions are current LTS versions (v12, v14) and the latest version - v16. Odd
(non LTS) versions might work, but are not actively tested. We recommend using the latest available LTS version 
(v14 as of today) for optimal stability and performance. v10 is still supported, but it already reached end-of-life and 
is deprecated.

If `node` is not available in the PATH, you can use property `sonar.nodejs.executable` to set an absolute path to
Node.js executable.
 
## Language-Specific Properties

Discover and update the JavaScript / TypeScript properties in: **<!-- sonarcloud -->Project <!-- /sonarcloud -->[Administration > General Settings > JavaScript / TypeScript](/#sonarqube-admin#/admin/settings?category=javascript+%2F+typescript)**.

## Supported Frameworks and Versions
* ECMAScript 3, 5, 2015, 2016, 2017, 2018, 2019, and 2020
* TypeScript 4.3
* React JSX
* Vue.js
* Flow

## Troubleshooting

### Slow or unresponsive analysis

On a big project, more memory may need to be allocated to analyze the project. This would be manifested by analysis getting stuck and the following stacktrace might appear in the logs

```
ERROR: Failed to get response while analyzing [file].ts
java.io.InterruptedIOException: timeout
```   
You can use `sonar.javascript.node.maxspace` property to allow the analysis to use more memory. Set this property to `4096` or `8192` for big projects. This property should be set in `sonar-project.properties` file or on command line for scanner (with `-Dsonar.javascript.node.maxspace=4096`).


### Default exclusions

By default, analysis will exclude files from dependencies in usual directories, such as `node_modules`, 
`bower_components`, `dist`, `vendor`, and `external`. It will also ignore `.d.ts` files. If for some reason analysis of files in these directories
is desired, it can be configured by setting `sonar.javascript.exclusions` property to empty value, i.e. 
`sonar.javascript.exclusions=""`, or to comma separated list of paths to be excluded. This property will exclude the 
files also for other languages, similar to `sonar.exclusions` property, however `sonar.exclusions` property should be 
preferred to configure general exclusions for the project.

### Custom rules
Custom rules are not supported by the analyzer. As an alternative we suggest you to have a look at [ESLint](https://eslint.org/docs/developer-guide/), it provides custom rules that you can then import thanks to the [External Issues](/analysis/external-issues/) feature.

## Related Pages

* [Test Coverage & Execution](/analysis/coverage/) (LCOV format)
* [Importing External Issues](/analysis/external-issues/) (ESLint, TSLint)
* [SonarJS Plugin for ESLint](https://github.com/SonarSource/eslint-plugin-sonarjs)
<!-- sonarqube -->
* [Adding Coding Rules](/extend/adding-coding-rules/)
<!-- /sonarqube -->
