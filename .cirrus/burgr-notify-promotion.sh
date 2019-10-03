#!/bin/bash

# Set the list of artifacts to display in BURGR
ARTIFACTS=com.sonarsource.dummy:sonar-dummy-plugin:jar

# Compute the version of the project
PROJECT_VERSION=$(cat ./version.txt)
echo "Project version: $PROJECT_VERSION"

# Create the URL of an artifact given a GAC (i.e. org.sonarsource.sonarqube:sonar-application:zip or com.sonarsource.sonarqube:sonarqube-enterprise:yguard:xml)
function createArtifactURL() {
  ARTIFACT=$1
  GAQE=(${ARTIFACT//:/ })
  GROUP_ID=${GAQE[0]}
  ARTIFACT_ID=${GAQE[1]}
  GROUP_ID_PATH=$(echo $GROUP_ID | tr '.' '/')

  FILENAME=$ARTIFACT_ID-$PROJECT_VERSION
  EXTENSION=
  if [ ${#GAQE[@]} = 4 ];then
    CLASSIFIER=${GAQE[2]}
    EXTENSION=${GAQE[3]}
    FILENAME=$FILENAME-$CLASSIFIER
  else
    EXTENSION=${GAQE[2]}
  fi
  FILENAME=$FILENAME.$EXTENSION

  echo $ARTIFACTORY_URL/sonarsource/$GROUP_ID_PATH/$ARTIFACT_ID/$PROJECT_VERSION/$FILENAME
}

# Create a comma-separated list of URLs of artifacts
function createArtifactsURLS() {
  ARTIFACTS=(${1//,/ })
  URLS=""
  if [ ${#ARTIFACTS[@]} = 1 ];then
    URLS=$(createArtifactURL $ARTIFACTS)
  else
    SEPARATOR=""
    for i in "${ARTIFACTS[@]}"; do
      URLS=$URLS$SEPARATOR$(createArtifactURL $i)
      SEPARATOR=,
    done
  fi
  echo $URLS
}

URLS=
if [ -n $ARTIFACTS ]; then
  URLS=$(createArtifactsURLS $ARTIFACTS)
fi

BURGR_FILE=promote.burgr
cat > $BURGR_FILE <<EOF
{
  "version":"$PROJECT_VERSION",
  "url":"$URLS",
  "buildNumber":"$BUILD_NUMBER"
}
EOF

HTTP_CODE=$(curl -s -o /dev/null -w %{http_code} -X POST -d @$BURGR_FILE -H "Content-Type:application/json" -u"${BURGR_USERNAME}:${BURGR_PASSWORD}" "${BURGR_URL}/api/promote/${CIRRUS_REPO_OWNER}/${CIRRUS_REPO_NAME}/${CIRRUS_BUILD_ID}")
if [ "$HTTP_CODE" != "200" ]; then
  echo "Cannot notify BURGR ($HTTP_CODE)"
else
  echo "BURGR notified"
fi