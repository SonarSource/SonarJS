#!/bin/bash
set -euo pipefail
echo "Running $TEST with SQ=$SQ_VERSION"

case "$TEST" in
  ci)

  #install npm
  node_home=$(pwd)/node-v8.9.0-win-x64
  node_archive=node.7z
  if [ ! -d "$node_home" ]; then
    echo "=== Install Node.js ===";
    curl --insecure --silent --show-error -o $node_archive https://nodejs.org/dist/v8.9.0/node-v8.9.0-win-x64.7z;
    7z x $node_archive;
    rm $node_archive;
  fi

  chmod 755 $node_home/node;

  export PATH=$node_home:$PATH;

  echo "Node version"
  node -v

  mvn clean package
  ;;

  plugin|ruling)

  cd its/$TEST
  mvn -B -e -Dsonar.runtimeVersion="$SQ_VERSION" -Dmaven.test.redirectTestOutputToFile=false package
  ;;

  *)
  echo "Unexpected TEST mode: $TEST"
  exit 1
  ;;
esac

