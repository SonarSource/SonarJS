Sonar JavaScript
================

##Quick Configuration Guide

| Property                                    | Scope                      | Default                                          | Example                    | Description |
| ---------|----------------|--------------- |-------------------|----------------------------------------------|
| sonar.javascript.file.suffixes              | System and or project wide | js                                               |  js                        | Comma separated list of file name extension to be considered as JavaScript source files during analysis.|
| sonar.javascript.coveragePlugin             | System and or project wide | lcov                                             | cobertura or lcov          | Coverage plugin to use when analyzing coverage reports |
| sonar.javascript.reportPath                 | Project wide               | unit-reports/*.xml                               | test_out/unit/\*.xml       | Ant pattern describing the path to junit compatible test reports, **relative to projects root**. |
| sonar.javascript.coverage.reportPath        | Project wide               | coverage/coverage-*.xml, coverage/coverage-*.dat | test_out/coverage/**/\*.xml| Ant pattern describing the path to coverage reports, **relative to projects root**. |
| sonar.javascript.coverage.itReportPath      | Project wide               | coverage/it-coverage-*.xml, coverage/it-coverage-*.dat | test_out/coverage/it/\*.xml| Ant pattern describing the path to integration test coverage reports, **relative to projects root**. |
| sonar.javascript.coverage.overallReportPath | Project wide               | coverage/overall-coverage-*.xml, coverage/overall-coverage-*.dat | test_out/coverage/overall/\*.xml| Ant pattern describing the path to overall test coverage reports, **relative to projects root**. |


##Sample sonar.properties
<pre>
# required metadata
sonar.projectKey=CItest
sonar.projectName=CI test
sonar.projectVersion=1.0
 
sonar.branch=js
# optional description
sonar.projectDescription=Fake description
 
# path to source directories (required)
sonar.sources=app/js
sonar.tests=test/unit
sonar.exclusions=app/lib/*.js,test/e2e/*.js,testacular*.js
 
# The value of the property must be the key of the language.
sonar.language=js

# Advanced parameters
sonar.dynamicAnalysis=reuseReports

# Javascript properties
sonar.javascript.coveragePlugin=cobertura
sonar.javascript.reportPath=test_out/unit/**/*.xml
sonar.javascript.coverage.reportPath=test_out/coverage/**/*.xml

# xml of the source files
sonar.sourceEncoding=UTF-8
</pre>