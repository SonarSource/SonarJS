#!/bin/bash
set -euo pipefail

# See https://xtranet.sonarsource.com/display/DEV/Open+Source+Licenses

mvn org.codehaus.mojo:license-maven-plugin:aggregate-add-third-party
