#!/bin/bash

set -euo pipefail

function configureTravis {
  mkdir ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v27 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}
configureTravis

case "$TEST" in

ci)
  # CI: build (incl. tests), deploy artifacts and triggers Dory analysis (incl. JaCoCo)
  # and handle PR analysis
  regular_mvn_build_deploy_analyze    
  ;;

plugin|ruling|type-inference)  
  echo "$TEST done in QA"
#  if [ "$SQ_VERSION" = "DEV" ] ; then
#    build_snapshot "SonarSource/sonarqube"
#  fi

#  mvn -Dsonar.runtimeVersion="$SQ_VERSION" -Dmaven.test.redirectTestOutputToFile=false -Pit-$TEST package
  ;;

*)
  echo "Unexpected TEST mode: $TEST"
  exit 1
  ;;

esac
