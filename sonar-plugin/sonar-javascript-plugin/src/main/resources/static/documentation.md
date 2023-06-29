---
title: JavaScript/TypeScript/CSS
key: javascript
---

<!-- static -->
<!-- update_center:javascript -->
<!-- /static -->

## Prerequisites

In order to analyze JavaScript, TypeScript or CSS code, you need to have supported version of Node.js installed on the
machine running the scan. The recommended versions are v18 or v20. We recommend using the [active LTS version of Node.js](https://nodejs.org/en/about/releases/) for optimal stability and performance. +v14.17.0 is still supported, but it already reached end-of-life and
is deprecated.

If `node` is not available in the PATH, you can use property `sonar.nodejs.executable` to set an absolute path to
Node.js executable.

If you have a community plugin for CSS analysis installed on your SonarQube instance it will conflict with analysis of CSS, so it should be removed.

## Language-Specific Properties

Discover and update the JavaScript / TypeScript [properties](/analysis/analysis-parameters/) in: **<!-- sonarcloud -->Project <!-- /sonarcloud -->[Administration > General Settings > JavaScript / TypeScript](/#sonarqube-admin#/admin/settings?category=javascript+%2F+typescript)**.

Discover and update the CSS [properties](/analysis/analysis-parameters/) in: **<!-- sonarcloud -->Project <!-- /sonarcloud -->[Administration > General Settings > CSS](/#sonarqube-admin#/admin/settings?category=css)**.

## Supported Frameworks, Versions and Languages

- ECMAScript 3 - 2022
- TypeScript 5.0.4
- React JSX, Vue.js, Angular
- Flow
- CSS, SCSS, Less, also 'style' inside PHP, HTML, and VueJS files

## Troubleshooting

### Slow or unresponsive analysis

On a big project, more memory may need to be allocated to analyze the project. This would be manifested by analysis getting stuck and the following stacktrace might appear in the logs

```
ERROR: Failed to get response while analyzing [file].ts
java.io.InterruptedIOException: timeout
```

You can use `sonar.javascript.node.maxspace` property to allow the analysis to use more memory. Set this property to `4096` or `8192` for big projects. This property should be set in `sonar-project.properties` file or on command line for scanner (with `-Dsonar.javascript.node.maxspace=4096`).

### Default exclusions for JS/TS

By default, analysis will exclude files from dependencies in usual directories, such as `node_modules`,
`bower_components`, `dist`, `vendor`, and `external`. It will also ignore `.d.ts` files. If for some reason analysis of files in these directories
is desired, it can be configured by setting `sonar.javascript.exclusions` property to empty value, i.e.
`sonar.javascript.exclusions=""`, or to comma separated list of paths to be excluded. This property will exclude only JavaScript/TypeScript files, while `sonar.exclusions` property will exclude all files. `sonar.exclusions` property should be
preferred to configure general exclusions for the project.

### Detection of code bundles

The analyzer will attempt to detect bundled code or generated code. This means code that was automatically transformed
and optimized with tools such as Webpack and similar. We consider generated code out of scope of the analysis since
developers are not able to act upon the findings in such code. Whenever generated code is detected, the analysis will
print a log message: once per the whole project on `INFO` level, and for each file on the `DEBUG` level. If you want to
opt-in for analyzing the generated code or in case the detection is incorrect, you can disable it by setting
`sonar.javascript.detectBundles=false`.

### Custom rules for JS/TS

Custom rules are not supported by the analyzer. As an alternative we suggest you to have a look at [ESLint](https://eslint.org/docs/developer-guide/), it provides custom rules that you can then import thanks to the [External Issues](/analysis/external-issues/) feature.

## Related Pages

- [Importing External Issues](/analysis/external-issues/) (ESLint, TSLint, StyleLint)
- [Test Coverage & Execution](/analysis/coverage/) (LCOV format)
- [SonarJS Plugin for ESLint](https://github.com/SonarSource/eslint-plugin-sonarjs)
<!-- sonarqube -->
- [Adding Coding Rules](/extend/adding-coding-rules/)
<!-- /sonarqube -->
