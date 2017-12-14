#!/bin/bash

set -euo pipefail

function configureTravis {
  mkdir -p ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v42 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}
configureTravis
. ~/.local/bin/installMaven35

export DEPLOY_PULL_REQUEST=true
regular_mvn_build_deploy_analyze
