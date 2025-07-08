#!/bin/bash
set -euo pipefail

: "${ARTIFACTORY_PRIVATE_USERNAME?}" "${ARTIFACTORY_ACCESS_TOKEN?}" "${ARTIFACTORY_URL?}"
: "${SONAR_SOURCE_IRIS_TOKEN?}" "${SONAR_TARGET_IRIS_TOKEN?}" "${SONAR_TARGET_URL?}"

function run_iris () {
  java \
    -Diris.source.projectKey="org.sonarsource.javascript:javascript" \
    -Diris.source.organization="sonarsource" \
    -Diris.source.url="https://next.sonarqube.com/sonarqube" \
    -Diris.source.token="$SONAR_SOURCE_IRIS_TOKEN" \
    -Diris.destination.projectKey="SonarSource_SonarJS" \
    -Diris.destination.organization="sonarsource" \
    -Diris.destination.url="$SONAR_TARGET_URL" \
    -Diris.destination.token="$SONAR_TARGET_IRIS_TOKEN" \
    -Diris.dryrun=$1 \
    -jar iris-\[RELEASE\]-jar-with-dependencies.jar
}

VERSION="\[RELEASE\]"
HTTP_CODE=$(\
  curl \
    --write-out '%{http_code}' \
    --location \
    --remote-name \
    --user "$ARTIFACTORY_PRIVATE_USERNAME:$ARTIFACTORY_ACCESS_TOKEN" \
    "$ARTIFACTORY_URL/sonarsource-private-releases/com/sonarsource/iris/iris/$VERSION/iris-$VERSION-jar-with-dependencies.jar"\
)

if [ "$HTTP_CODE" != "200" ]; then
  echo "Download $VERSION failed -> $HTTP_CODE"
  exit 1
else
  echo "Downloaded $VERSION"
fi

echo "===== Execute IRIS as dry-run"
run_iris "true"
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "===== Failed to run IRIS dry-run"
  exit 1
else
  echo "===== Successful IRIS dry-run - executing IRIS for real."
  run_iris "false"
fi
