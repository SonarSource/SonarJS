#!/bin/bash

set -euo pipefail

function installTravisTools {
  mkdir ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v21 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}

case "$TEST" in

ci)
  mvn verify -B -e -V
  ;;

plugin|ruling|type-inference)
  installTravisTools

  if [ "$SQ_VERSION" = "DEV" ] ; then
    build_snapshot "SonarSource/sonarqube"
  fi

  mvn -Dsonar.runtimeVersion="$SQ_VERSION" -Dmaven.test.redirectTestOutputToFile=false -Pit-$TEST package
  ;;

*)
  echo "Unexpected TEST mode: $TEST"
  exit 1
  ;;

esac
