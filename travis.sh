#!/bin/bash

set -euo pipefail

function installTravisTools {
  mkdir ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v16 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}

case "$TESTS" in

CI)
  mvn verify -B -e -V
  ;;

IT-DEV)
  installTravisTools

  mvn install -T2 -Dsource.skip=true -Denforcer.skip=true -Danimal.sniffer.skip=true -Dmaven.test.skip=true

  git clone https://github.com/SonarCommunity/javascript-test-sources.git it_sources
  export SONAR_IT_SOURCES=$(pwd)/it_sources

  build_snapshot "SonarSource/sonarqube"

  cd its/plugin
  mvn -DjavascriptVersion="DEV" -Dsonar.runtimeVersion="DEV" -Dmaven.test.redirectTestOutputToFile=false install
  ;;

IT-LTS)
  installTravisTools

  mvn install -T2 -Dsource.skip=true -Denforcer.skip=true -Danimal.sniffer.skip=true -Dmaven.test.skip=true

  git clone https://github.com/SonarCommunity/javascript-test-sources.git it_sources
  export SONAR_IT_SOURCES=$(pwd)/it_sources

  cd its/plugin
  mvn -DjavascriptVersion="DEV" -Dsonar.runtimeVersion="LTS_OR_OLDEST_COMPATIBLE" -Dmaven.test.redirectTestOutputToFile=false install
  ;;

RULING)
  installTravisTools

  mvn install -Dsource.skip=true -T2 -Denforcer.skip=true -Danimal.sniffer.skip=true -Dmaven.test.skip=true

  build_snapshot "SonarSource/sonar-lits"

  ./run-ruling-test.sh
  ;;

TYPES)
  installTravisTools

  mvn install -Dsource.skip=true -T2 -Denforcer.skip=true -Danimal.sniffer.skip=true -Dmaven.test.skip=true

  build_snapshot "SonarSource/sonar-lits"

  cd its/type-inference
  mvn clean install -Dmaven.test.redirectTestOutputToFile=false -DjavascriptVersion="DEV" -Dsonar.runtimeVersion="LATEST_RELEASE"

  ;;

esac
