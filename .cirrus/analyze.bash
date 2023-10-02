#!/bin/bash

# inspired by https://github.com/SonarSource/re-ci-images/blob/b9f43ffec926c0828a279aefc5a94cb5060bfee5/docker/bin/src/regular_mvn_build_deploy_analyze#L51-L61

mvn verify sonar:sonar \
      -Pcoverage \
      -Dmaven.test.redirectTestOutputToFile=false \
      -Dsonar.host.url="$SONAR_HOST_URL" \
      -Dsonar.token="$SONAR_TOKEN" \
      -Dsonar.projectVersion="$CURRENT_VERSION" \
      -Dsonar.analysis.buildNumber="$BUILD_NUMBER" \
      -Dsonar.analysis.pipeline="$PIPELINE_ID" \
      -Dsonar.analysis.sha1="$GIT_SHA1"  \
      -Dsonar.analysis.repository="$GITHUB_REPO" \
      -B -e -V "$@"
