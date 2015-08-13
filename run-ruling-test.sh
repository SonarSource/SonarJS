#!/bin/bash

set -euo pipefail

export SONAR_IT_SOURCES=$(pwd)/its/sources

cd its/ruling
mvn clean install -Dmaven.test.redirectTestOutputToFile=false -DjavascriptVersion="DEV" -Dsonar.runtimeVersion="LATEST_RELEASE"
