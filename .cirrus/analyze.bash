#!/bin/bash

mvn sonar:sonar \
      -Pcoverage,deploy-sonarsource,release,sign \
      -Dmaven.test.redirectTestOutputToFile=false \
      -Dsonar.host.url="$SONAR_HOST_URL" \
      -Dsonar.token="$SONAR_TOKEN" \
      -Dsonar.projectVersion="$CURRENT_VERSION" \
      -Dsonar.analysis.buildNumber="$BUILD_NUMBER" \
      -Dsonar.analysis.pipeline="$PIPELINE_ID" \
      -Dsonar.analysis.sha1="$GIT_SHA1"  \
      -Dsonar.analysis.repository="$GITHUB_REPO" \
      -B -e -V "$@"
