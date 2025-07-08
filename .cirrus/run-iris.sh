#!/bin/bash
set -euo pipefail

: "${ARTIFACTORY_USERNAME?}" "${ARTIFACTORY_ACCESS_TOKEN?}" "${ARTIFACTORY_URL?}"
: "${SONAR_SQC_EU_URL?}" "${SONAR_IRIS_SQC_EU_TOKEN?}"
: "${SONAR_SQC_US_URL?}" "${SONAR_IRIS_SQC_US_TOKEN?}"
: "${SONAR_NEXT_URL?}" "${SONAR_IRIS_NEXT_TOKEN?}"

# Run IRIS from SQS to SQC EU
function run_iris_sqc_eu () {
  java \
    -Diris.source.projectKey="org.sonarsource.javascript:javascript" \
    -Diris.source.organization="sonarsource" \
    -Diris.source.url="$SONAR_NEXT_URL" \
    -Diris.source.token="$SONAR_IRIS_NEXT_TOKEN" \
    -Diris.destination.projectKey="SonarSource_SonarJS" \
    -Diris.destination.organization="sonarsource" \
    -Diris.destination.url="$SONAR_SQC_EU_URL" \
    -Diris.destination.token="$SONAR_IRIS_SQC_EU_TOKEN" \
    -Diris.dryrun=$1 \
    -jar iris-\[RELEASE\]-jar-with-dependencies.jar
}

# Run IRIS from SQS to SQC US
function run_iris_sqc_us () {
  java \
    -Diris.source.projectKey="org.sonarsource.javascript:javascript" \
    -Diris.source.organization="sonarsource" \
    -Diris.source.url="$SONAR_NEXT_URL" \
    -Diris.source.token="$SONAR_IRIS_NEXT_TOKEN" \
    -Diris.destination.projectKey="SonarSource_SonarJS" \
    -Diris.destination.organization="sonarsource" \
    -Diris.destination.url="$SONAR_SQC_US_URL" \
    -Diris.destination.token="$SONAR_IRIS_SQC_US_TOKEN" \
    -Diris.dryrun=$1 \
    -jar iris-\[RELEASE\]-jar-with-dependencies.jar
}

VERSION="\[RELEASE\]"
HTTP_CODE=$(\
  curl \
    --write-out '%{http_code}' \
    --location \
    --remote-name \
    --user "$ARTIFACTORY_USERNAME:$ARTIFACTORY_ACCESS_TOKEN" \
    "$ARTIFACTORY_URL/sonarsource-private-releases/com/sonarsource/iris/iris/$VERSION/iris-$VERSION-jar-with-dependencies.jar"\
)

if [ "$HTTP_CODE" != "200" ]; then
  echo "Download $VERSION failed -> $HTTP_CODE"
  exit 1
else
  echo "Downloaded $VERSION"
fi

echo "===== Execute IRIS SQC EU as dry-run"
run_iris_sqc_eu "true"
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "===== Failed to run IRIS SQC EU dry-run"
  exit 1
else
  echo "===== Successful IRIS SQC EU dry-run - executing IRIS for real."
  run_iris_sqc_eu "false"
fi

echo "===== Execute IRIS SQC US as dry-run"
run_iris_sqc_us "true"
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "===== Failed to run IRIS SQC US dry-run"
  exit 1
else
  echo "===== Successful IRIS SQC US dry-run - executing IRIS for real."
  run_iris_sqc_us "false"
fi
