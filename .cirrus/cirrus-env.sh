#!/bin/bash

set -euo pipefail

# generic environment variables used by Gradle build
export GIT_SHA1=$CIRRUS_CHANGE_IN_REPO
export GITHUB_BASE_BRANCH=${CIRRUS_BASE_BRANCH:-}
export GITHUB_BRANCH=$CIRRUS_BRANCH
export GITHUB_REPO=${CIRRUS_REPO_FULL_NAME}
export PROJECT=${CIRRUS_REPO_NAME}
export PULL_REQUEST=${CIRRUS_PR:-}

export LANG=C.UTF-8

FUNCTION_URL=https://us-central1-ci-cd-215716.cloudfunctions.net
cirrusBuildNumber() {
  curl -s --retry 5 --retry-max-time 60 -H "Authorization: Bearer ABCDE" "${FUNCTION_URL}/cirrusBuildNumber/$CIRRUS_REPO_FULL_NAME/$CIRRUS_BUILD_ID" "$@"
}

TASK_TYPE=$1
if [ "$TASK_TYPE" == "BUILD" ]; then
  export BUILD_NUMBER=$(cirrusBuildNumber -X POST)
else
  export BUILD_NUMBER=$(cirrusBuildNumber)
fi
export BUILD_ID=${BUILD_NUMBER}
printenv | grep -v -e USERNAME -e PASSWORD -e KEY -e TOKEN | sort