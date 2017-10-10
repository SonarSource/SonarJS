#!/bin/bash

set -euo pipefail

function configureTravis {
  mkdir -p ~/.local
  curl -sSL https://github.com/SonarSource/travis-utils/tarball/v35 | tar zx --strip-components 1 -C ~/.local
  source ~/.local/bin/install
}
configureTravis

# When pull request exists on the branch, then the job related to the branch does not need
# to be executed and should be canceled. It does not book slaves for nothing.
# @TravisCI please provide the feature natively, like at AppVeyor or CircleCI ;-)
cancel_branch_build_with_pr

export DEPLOY_PULL_REQUEST=true
regular_mvn_build_deploy_analyze
