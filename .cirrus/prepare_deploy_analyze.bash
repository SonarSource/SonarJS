#!/bin/bash

# taken from https://github.com/SonarSource/re-ci-images/blob/b9f43ffec926c0828a279aefc5a94cb5060bfee5/docker/bin/src/regular_mvn_build_deploy_analyze#L41-L49

# Analyze with SNAPSHOT version as long as SQ does not correctly handle
# purge of release data
CURRENT_VERSION=$(maven_expression "project.version")

. set_maven_build_version "$BUILD_NUMBER"

export MAVEN_OPTS="-Xmx1536m -Xms128m"

check_version_format "$PROJECT_VERSION"

# taken from https://github.com/SonarSource/re-ci-images/blob/b9f43ffec926c0828a279aefc5a94cb5060bfee5/docker/bin/src/includes/version_util#L15-L22

# Verify that the version declared in pom.xml or in gradle.properties
# use the following pattern: x.x.x.x (<major>.<minor>.<patch>.<buildNumber>) and warn if not.
# Args:
#  $1 The version string to check
function check_version_format(){
  local version=$1
  local extracted_points="${version//[^.]}"
  local point_count=${#extracted_points}
  if [[ "$point_count" != 3 ]]; then
    echo "WARN: This version $version does not match the standardized format used commonly across the organization: '<MAJOR>.<MINOR>.<PATCH>.<BUILD NUMBER>'."
  fi
}
