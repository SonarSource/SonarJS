#!/bin/bash

# inspired from https://github.com/SonarSource/re-ci-images/blob/1f74074e7162373b2139a514a3b4013d85a29d43/docker/bin/src/regular_mvn_build_deploy_analyze#L51-L61

# we've already run the tests during the build phase
mvn deploy -DskipTests -Pdeploy-sonarsource,release,sign -B -e -V "$@"
