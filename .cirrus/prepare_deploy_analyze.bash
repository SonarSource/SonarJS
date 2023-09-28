#!/bin/bash

source "$(dirname "$0")"/../includes/version_util

# taken from https://github.com/SonarSource/re-ci-images/blob/b9f43ffec926c0828a279aefc5a94cb5060bfee5/docker/bin/src/regular_mvn_build_deploy_analyze#L41-L49

# Analyze with SNAPSHOT version as long as SQ does not correctly handle
# purge of release data
CURRENT_VERSION=$(maven_expression "project.version")

. set_maven_build_version "$BUILD_NUMBER"

export MAVEN_OPTS="-Xmx1536m -Xms128m"

check_version_format "$PROJECT_VERSION"

