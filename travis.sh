#!/bin/bash

set -euo pipefail

function configureTravis {
  mkdir ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v28 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}
configureTravis

case "$TEST" in

ci)
  regular_mvn_build_deploy_analyze
  ;;

ruling)

  mvn -B -e -Dsource.skip=true -Denforcer.skip=true -Danimal.sniffer.skip=true -Dmaven.test.skip=true package
  cd its/ruling
  mvn -B -e -Dsonar.runtimeVersion="LATEST_RELEASE" -Dmaven.test.redirectTestOutputToFile=false package
  ;;

*)
  echo "Unexpected TEST mode: $TEST"
  exit 1
  ;;

esac
