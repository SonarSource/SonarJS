#!/bin/bash

set -euo pipefail

function installTravisTools {
  mkdir ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v16 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}

case "$TEST" in

ci)
  mvn verify -B -e -V
  ;;

plugin|ruling|type-inference)
  installTravisTools

  mvn package -Dsource.skip=true -Denforcer.skip=true -Danimal.sniffer.skip=true -Dmaven.test.skip=true

  if [ "$SQ_VERSION" = "DEV" ] ; then
    build_snapshot "SonarSource/sonarqube"
  fi

  cd its/$TEST
  # "mvn package" and not "test" only because the test requires a custom plugin which is build in submodule "plugins"
  # bfore the tests execution.
  mvn -Dsonar.runtimeVersion="$SQ_VERSION" -Dmaven.test.redirectTestOutputToFile=false package
  ;;

*)
  echo "Unexpected TEST mode: $TEST"
  exit 1
  ;;

esac
