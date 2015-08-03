#!/bin/bash

set -eu

git clone "https://github.com/SonarSource/sslr.git"
cd sslr
git checkout -b typed
git pull https://github.com/pynicolas/sslr.git typed
mvn install
cd ..

mvn verify -B -e -V
